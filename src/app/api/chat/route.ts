import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { checkRateLimit } from '@/lib/rate-limit'
import { serverConfig } from '@/config/tavily.config'
import { Client, Account } from 'node-appwrite'
import { cookies } from 'next/headers'
import { processQueryStream } from '@/lib/langgraph-agent'

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

        // Create a readable stream for Server-Sent Events
        const stream = new ReadableStream({
            start(controller) {
                const encoder = new TextEncoder()
                
                // Process query using the LangGraph agent
                processQueryStream({
                    messages: langchainMessages,
                    query: lastMessage.content,
                    userId: userId || undefined,
                    chatbotId: chatbotId || undefined,
                    namespace: namespace || undefined,
                    onUpdate: (update) => {
                        try {
                            const data = JSON.stringify(update) + '\n'
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                        } catch (error) {
                            console.error('Stream encoding error:', error)
                        }
                    },
                }).then(() => {
                    // Send completion signal
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                    controller.close()
                }).catch((error) => {
                    console.error('Agent processing error:', error)
                    // Send error response
                    const errorUpdate = {
                        type: 'complete',
                        data: {
                            response: 'I apologize, but I encountered an error while processing your request.',
                            sources: [],
                            isCompanySpecific: false,
                        }
                    }
                    const data = JSON.stringify(errorUpdate) + '\n'
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                    controller.close()
                })
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        })

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