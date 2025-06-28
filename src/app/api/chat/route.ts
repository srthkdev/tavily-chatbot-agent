import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { checkRateLimit } from '@/lib/rate-limit'
import { serverConfig } from '@/config/tavily.config'
import { Client, Account } from 'node-appwrite'
import { cookies } from 'next/headers'
import { processQuery } from '@/lib/langgraph-agent'

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
        const { messages, namespace, chatbotId, useWebSearch = false } = body

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

        const userId = await getUserId()

        // Convert messages to LangChain format
        const langchainMessages = messages.map((msg: { role: string; content: string }) => {
            if (msg.role === 'user') {
                return new HumanMessage(msg.content)
            } else {
                return new AIMessage(msg.content)
            }
        })

        // Process query using the LangGraph agent to get the response
        const result = await processQuery({
            messages: langchainMessages,
            query: lastMessage.content,
            userId: userId || undefined,
            chatbotId: chatbotId || undefined,
            namespace: namespace || undefined,
        })

        // Check if AI model is available
        if (!serverConfig.ai.model) {
            throw new Error('No AI model configured')
        }

        // Use streamText to create a proper AI SDK compatible stream
        const stream = await streamText({
            model: serverConfig.ai.model,
            messages: [
                {
                    role: 'system',
                    content: 'You are an AI assistant. Please respond with exactly the following text, word for word:'
                },
                {
                    role: 'user', 
                    content: result.response
                }
            ],
        })

        // Create response with sources in headers (encode to handle Unicode characters)
        const sourcesJson = JSON.stringify(result.sources)
        const sourcesBase64 = Buffer.from(sourcesJson, 'utf8').toString('base64')
        
        const response = stream.toDataStreamResponse({
            headers: {
                'x-sources': sourcesBase64,
                'x-sources-encoding': 'base64',
                'x-company-specific': result.isCompanySpecific.toString(),
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