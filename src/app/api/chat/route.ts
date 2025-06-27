import { NextRequest, NextResponse } from 'next/server'
import { streamText, tool } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { tavily } from '@tavily/core'
import { searchDocuments } from '@/lib/upstash-search'
import { checkRateLimit } from '@/lib/rate-limit'
import { serverConfig } from '@/config/tavily.config'
import { Client, Account } from 'node-appwrite'
import { cookies } from 'next/headers'
import { getMemoryContext, addConversationTurn, isMem0Available } from '@/lib/mem0'

// Helper to get user ID from session
async function getUserId() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('appwrite-session')
  if (!sessionCookie) return null

  try {
    const client = new Client()
      .setEndpoint(serverConfig.appwrite.endpoint)
      .setProject(serverConfig.appwrite.projectId)
      .setSession(sessionCookie.value)
    const account = new Account(client)
    const user = await account.get()
    return user.$id
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { messages, namespace, useWebSearch = false, maxResults = 5 } = body

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
        }

        const lastMessage = messages[messages.length - 1]
        if (!lastMessage?.content) {
            return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
        }

        // Check rate limit
        const clientIP = request.headers.get('x-forwarded-for') || 'anonymous'
        const rateLimit = await checkRateLimit('query', clientIP)
        
        if (!rateLimit.success) {
            return NextResponse.json(
                { 
                    error: 'Rate limit exceeded',
                    limit: rateLimit.limit,
                    remaining: rateLimit.remaining,
                    reset: rateLimit.reset,
                }, 
                { status: 429 }
            )
        }

        // Get AI model
        const model = serverConfig.ai.model
        if (!model) {
            return NextResponse.json(
                { error: 'No AI provider configured' },
                { status: 500 }
            )
        }

        const userId = await getUserId()
        const mem0Enabled = isMem0Available() && serverConfig.mem0.enableUserMemory && userId

        let contextSources: any[] = []
        let memoryContext = ''

        // 1. Get memory context if available
        if (mem0Enabled) {
            memoryContext = await getMemoryContext(lastMessage.content, { user_id: userId })
        }

        // Initialize Tavily if API key is available
        const tavilyApiKey = process.env.TAVILY_API_KEY
        const tavilyClient = tavilyApiKey ? tavily({ apiKey: tavilyApiKey }) : null

        // Define tools
        const tools = {
            searchWeb: tool({
                description: 'Search the web for current information on any topic. Use this when the user asks about recent events, current information, or topics not covered in the knowledge base.',
                parameters: z.object({
                    query: z.string().describe('The search query')
                }),
                execute: async ({ query }) => {
                    if (!tavilyClient) {
                        return { error: 'Web search not available - Tavily API key not configured' }
                    }
                    
                    try {
                        const response = await tavilyClient.search(query, {
                            searchDepth: 'basic',
                            includeAnswer: true,
                            maxResults: Math.min(maxResults, serverConfig.search.maxContextDocs)
                        })
                        
                        const webSources = response.results.map((result: any, index: number) => ({
                            id: `web-${index}`,
                            url: result.url,
                            title: result.title,
                            snippet: result.content?.substring(0, serverConfig.search.snippetLength) || '',
                            score: 1.0,
                            index: index + 1
                        }))

                        contextSources = [...contextSources, ...webSources]
                        
                        return {
                            results: response.results.map((result: any) => ({
                                title: result.title,
                                url: result.url,
                                content: result.content
                            })),
                            answer: response.answer
                        }
                    } catch (error) {
                        return { error: `Web search failed: ${error}` }
                    }
                }
            }),
            searchKnowledgeBase: tool({
                description: 'Search the knowledge base for information related to the uploaded documents or website content. Use this when the user asks about specific content from the chatbot\'s knowledge base.',
                parameters: z.object({
                    query: z.string().describe('The search query')
                }),
                execute: async ({ query }) => {
                    if (!namespace) {
                        return { error: 'No knowledge base available for this chatbot' }
                    }
                    
                    try {
                        const results = await searchDocuments(
                            query,
                            namespace,
                            Math.min(maxResults, serverConfig.search.maxContextDocs)
                        )

                        if (results.length > 0) {
                            const vectorSources = results.map((result, index) => ({
                                id: result.id,
                                url: result.metadata.sourceURL || result.metadata.url,
                                title: result.metadata.pageTitle || result.metadata.title,
                                snippet: result.metadata.fullContent?.substring(0, serverConfig.search.snippetLength) || '',
                                score: result.score,
                                index: contextSources.length + index + 1
                            }))

                            contextSources = [...contextSources, ...vectorSources]
                            
                            return {
                                results: results.map((result: any) => ({
                                    title: result.metadata.title || 'Document',
                                    url: result.metadata.sourceURL || result.metadata.url,
                                    content: result.metadata.fullContent?.substring(0, 1000) || result.metadata.text?.substring(0, 1000)
                                }))
                            }
                        }
                        
                        return { results: [] }
                    } catch (error) {
                        return { error: `Knowledge base search failed: ${error}` }
                    }
                }
            })
        }

        // Prepare system prompt with memory context
        let systemPrompt = serverConfig.ai.systemPrompt
        if (memoryContext) {
            systemPrompt = `${memoryContext}\n\n${systemPrompt}\n\nFor any facts or information you provide, you must cite the source using the [index] notation when sources are available.`
        } else {
            systemPrompt = `${systemPrompt}\n\nFor any facts or information you provide, you must cite the source using the [index] notation when sources are available.`
        }

        let fullResponse = ''
        const result = await streamText({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            tools,
            maxTokens: serverConfig.ai.maxTokens,
            temperature: serverConfig.ai.temperature,
            onFinish: async (event) => {
                fullResponse = event.text
                
                // Add conversation to memory
                if (mem0Enabled) {
                    await addConversationTurn(
                        lastMessage.content,
                        fullResponse,
                        { user_id: userId }
                    ).catch(e => console.error('Failed to add conversation to memory:', e));
                }
            },
        })

        const response = new Response(result.toDataStreamResponse().body, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Sources': contextSources.length > 0 ? JSON.stringify(contextSources) : '',
            }
        })

        return response

    } catch (error) {
        console.error('Chat API error:', error)
        return NextResponse.json(
            { 
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
} 