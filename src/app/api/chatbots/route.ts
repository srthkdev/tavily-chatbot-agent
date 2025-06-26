import { NextRequest, NextResponse } from 'next/server'
import { Client, Account, Databases, Query } from 'node-appwrite'
import { clientConfig } from '@/config/tavily.config'
import { cookies } from 'next/headers'

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

    // Create client with session (using node-appwrite for server-side)
    const client = new Client()
    client
      .setEndpoint(clientConfig.appwrite.endpoint)
      .setProject(clientConfig.appwrite.projectId)

    // For user operations, use session-only (not API key)
    client.setSession(sessionCookie.value)

    const account = new Account(client)
    const databases = new Databases(client)

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