import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite'
import { Query } from 'node-appwrite'
import { cookies } from 'next/headers'
import { clientConfig } from '@/config/tavily.config'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('appwrite-session')
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Create session client
    const { account, databases } = createSessionClient(sessionCookie.value)

    // Get current user
    let user
    try {
      user = await account.get()
    } catch (error) {
      cookieStore.delete('appwrite-session')
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get user's chatbots
    const response = await databases.listDocuments(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      [
        Query.equal('userId', user.$id),
        Query.orderDesc('createdAt'),
        Query.limit(50)
      ]
    )
    
    const chatbots = response.documents

    return NextResponse.json({
      success: true,
      data: chatbots
    })

  } catch (error) {
    console.error('Get chatbots error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve chatbots' },
      { status: 500 }
    )
  }
} 