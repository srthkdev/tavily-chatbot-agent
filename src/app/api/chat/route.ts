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
        let model
        try {
            model = serverConfig.ai.model
        } catch (error) {
            console.error('❌ AI Model error:', error)
            return NextResponse.json(
                { error: 'AI model configuration error: ' + (error instanceof Error ? error.message : 'Unknown error') },
                { status: 500 }
            )
        }
        
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

        // Search functions (without tools to avoid Groq compatibility issues)
        async function performWebSearch(query: string) {
            if (!tavilyClient) return null
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
                return response
            } catch (error) {
                console.error('Web search error:', error)
                return null
            }
        }

        // Disable tools for now since Groq might not support them properly
        const tools = {}

        // Auto-search for certain types of questions
        const searchKeywords = ['weather', 'news', 'current', 'today', 'latest', 'recent', 'now', 'what is happening']
        const shouldSearch = useWebSearch || searchKeywords.some(keyword => 
            lastMessage.content.toLowerCase().includes(keyword)
        )
        
        let searchContext = ''
        if (shouldSearch && tavilyClient) {
            const searchResponse = await performWebSearch(lastMessage.content)
            if (searchResponse) {
                searchContext = `\n\nBased on current web search results:\n${searchResponse.results.map((r: any) => 
                    `- ${r.title}: ${r.content?.substring(0, 200)}...`
                ).join('\n')}`
            }
        }

        // Prepare system prompt with memory context
        let systemPrompt = serverConfig.ai.systemPrompt + searchContext
        if (memoryContext) {
            systemPrompt = `${memoryContext}\n\n${systemPrompt}\n\nFor any facts or information you provide, you must cite the source using the [index] notation when sources are available.`
        } else {
            systemPrompt = `${systemPrompt}\n\nFor any facts or information you provide, you must cite the source using the [index] notation when sources are available.`
        }

        let fullResponse = ''
        let result
        try {
            result = await streamText({
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

        } catch (error) {
            console.error('❌ StreamText error:', error)
            return NextResponse.json(
                { error: 'AI streaming error: ' + (error instanceof Error ? error.message : 'Unknown error') },
                { status: 500 }
            )
        }

        const response = new Response(result.toDataStreamResponse().body, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Sources': contextSources.length > 0 ? JSON.stringify(contextSources) : '',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
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