import { NextRequest, NextResponse } from 'next/server'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { checkRateLimit } from '@/lib/rate-limit'
import { serverConfig } from '@/config/tavily.config'
import { Client, Account } from 'node-appwrite'
import { cookies } from 'next/headers'
import { processQuery } from '@/lib/langgraph-agent'
import { handleCompanyChatQuery } from '@/lib/company-research-agent'
import { chatStorage } from '@/lib/chat-storage'

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
        const { messages, namespace, chatbotId } = body

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

        // Check if this is a company chatbot by fetching chatbot data
        let isCompanyBot = false
        let companyData = null
        
        if (chatbotId) {
            try {
                const chatbotResponse = await fetch(`${request.url.split('/api')[0]}/api/chatbots/${chatbotId}`, {
                    headers: {
                        'Cookie': request.headers.get('Cookie') || ''
                    }
                })
                
                if (chatbotResponse.ok) {
                    const chatbotResult = await chatbotResponse.json()
                    if (chatbotResult.success && chatbotResult.data) {
                        // Check if this is a company-specific chatbot (has company data or specific namespace pattern)
                        const data = chatbotResult.data
                        if (data.url && data.name && data.namespace) {
                            isCompanyBot = true
                            // Extract company info from chatbot data
                            companyData = {
                                name: data.name,
                                url: data.url,
                                description: data.description || `AI assistant for ${data.name}`,
                                domain: data.url ? new URL(data.url).hostname : data.namespace.split('-')[0],
                                // Map to CompanyInfo interface
                                companyInfo: {
                                    name: data.name,
                                    domain: data.url ? new URL(data.url).hostname : data.namespace.split('-')[0],
                                    description: data.description || `AI assistant for ${data.name}`,
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch chatbot data:', error)
            }
        }

        // Create a streaming response
        const encoder = new TextEncoder()
        
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const sendData = (data: unknown) => {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
                    }

                    let result
                    
                    if (isCompanyBot && companyData) {
                        // Send initial status
                        sendData({ type: 'status', data: `Connecting to ${companyData.name} knowledge base...` })
                        
                        // Use company research agent for company chatbots
                        result = await handleCompanyChatQuery({
                            company: companyData.name,
                            companyUrl: companyData.url,
                            messages: langchainMessages,
                            userId: userId || undefined,
                            chatbotId: chatbotId || undefined,
                            namespace: namespace || undefined,
                        })
                        
                        // Send sources if available
                        if (result.sources && result.sources.length > 0) {
                            sendData({ type: 'sources', data: result.sources })
                        }
                    } else {
                        // Send initial status
                        sendData({ type: 'status', data: 'Processing your request...' })
                        
                        // Use regular agent for standard chatbots
                        result = await processQuery({
                            messages: langchainMessages,
                            query: lastMessage.content,
                            userId: userId || undefined,
                            chatbotId: chatbotId || undefined,
                            namespace: namespace || undefined,
                            companyInfo: companyData?.companyInfo || undefined,
                        })
                        
                        // Send sources if available
                        if (result.sources && result.sources.length > 0) {
                            sendData({ type: 'sources', data: result.sources })
                        }
                    }

                    // Save messages to database if user is authenticated
                    if (userId && chatbotId) {
                        try {
                            // Save user message
                            await chatStorage.saveMessage({
                                chatbotId,
                                userId,
                                role: 'user',
                                content: lastMessage.content,
                                isCompanySpecific: isCompanyBot,
                            })

                            // Save assistant response
                            await chatStorage.saveMessage({
                                chatbotId,
                                userId,
                                role: 'assistant',
                                content: result.response,
                                sources: result.sources || [],
                                isCompanySpecific: isCompanyBot || ('isCompanySpecific' in result ? result.isCompanySpecific : false),
                            })

                            // Update or create session
                            await chatStorage.saveSession({
                                chatbotId,
                                userId,
                                title: lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : ''),
                                lastMessage: result.response.substring(0, 100) + (result.response.length > 100 ? '...' : ''),
                                messageCount: messages.length + 1,
                            })
                        } catch (error) {
                            console.warn('Failed to save chat messages:', error)
                        }
                    }

                    // Send the complete response
                    sendData({
                        type: 'complete',
                        data: {
                            response: result.response,
                            sources: result.sources || [],
                            isCompanySpecific: isCompanyBot || ('isCompanySpecific' in result ? result.isCompanySpecific : false)
                        }
                    })
                    
                    // End the stream
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                    controller.close()
                    
                } catch (error) {
                    console.error('Stream error:', error)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'error',
                        data: error instanceof Error ? error.message : 'Unknown error'
                    })}\n\n`))
                    controller.close()
                }
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
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