import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite'
import { cookies } from 'next/headers'
import { clientConfig } from '@/config/tavily.config'
import { Query } from 'node-appwrite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatbotId } = await params

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

    // Load chat messages for this chatbot and user
    const messagesResult = await databases.listDocuments(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.messages,
      [
        Query.equal('chatbotId', chatbotId),
        Query.equal('userId', user.$id),
        Query.orderAsc('timestamp'),
        Query.limit(100)
      ]
    )

    // Transform messages
    const messages = messagesResult.documents.map(doc => ({
      id: doc.messageId,
      role: doc.role,
      content: doc.content,
      sources: JSON.parse(doc.sources || '[]'),
      capabilities: JSON.parse(doc.capabilities || '[]'),
      timestamp: doc.timestamp
    }))

    return NextResponse.json({
      success: true,
      messages
    })

  } catch (error) {
    console.error('Load chat history error:', error)
    return NextResponse.json(
      { error: 'Failed to load chat history' },
      { status: 500 }
    )
  }
} 