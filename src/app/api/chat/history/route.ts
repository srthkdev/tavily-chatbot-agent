import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite'
import { chatStorage } from '@/lib/chat-storage'
import { cookies } from 'next/headers'
import { clientConfig } from '@/config/tavily.config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chatbotId = searchParams.get('chatbotId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!chatbotId) {
      return NextResponse.json({ error: 'chatbotId is required' }, { status: 400 })
    }

    // Check authentication
    const sessionCookie = request.headers.get('cookie')
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const sessionMatch = sessionCookie.match(/appwrite-session=([^;]+)/)
    if (!sessionMatch) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
    }

    // Create session client
    const { account } = createSessionClient(sessionMatch[1])
    const user = await account.get()

    // Get chat messages
    const messages = await chatStorage.getMessages(chatbotId, user.$id, limit)

    // Reverse to get chronological order (oldest first)
    const sortedMessages = messages.reverse()

    return NextResponse.json({
      success: true,
      data: {
        messages: sortedMessages,
        total: messages.length,
      }
    })

  } catch (error) {
    console.error('Chat history error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load chat history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chatbotId, message } = body

    if (!chatbotId || !message) {
      return NextResponse.json({ error: 'Chatbot ID and message are required' }, { status: 400 })
    }

    // Check authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('appwrite-session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Create session client
    const { account, databases } = createSessionClient(sessionCookie.value)

    // Get current user
    let user
    try {
      user = await account.get()
    } catch (error) {
      console.error('Session validation failed:', error)
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Save chat message
    await databases.createDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.messages,
      'unique()',
      {
        chatbotId,
        userId: user.$id,
        messageId: message.id,
        role: message.role,
        content: message.content,
        sources: JSON.stringify(message.sources || []),
        capabilities: JSON.stringify(message.capabilities || []),
        timestamp: message.timestamp,
        createdAt: new Date().toISOString()
      }
    )

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Save chat message error:', error)
    return NextResponse.json(
      { error: 'Failed to save chat message' },
      { status: 500 }
    )
  }
} 