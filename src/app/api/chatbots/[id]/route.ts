import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite'
import { cookies } from 'next/headers'
import { Query } from 'node-appwrite'
import { clientConfig } from '@/config/tavily.config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const chatbotId = resolvedParams.id

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
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get chatbot by ID (document ID) or namespace and verify ownership
    try {
      let chatbot = null
      
      // First try to get by document ID
      try {
        const directResponse = await databases.getDocument(
          clientConfig.appwrite.databaseId,
          clientConfig.appwrite.collections.chatbots,
          chatbotId
        )
        
        // Verify ownership
        if (directResponse.userId === user.$id) {
          chatbot = directResponse
        }
      } catch (error) {
        // If direct ID lookup fails, try namespace lookup
        console.log('Direct ID lookup failed, trying namespace lookup')
      }
      
      // If direct lookup failed or didn't match user, try namespace lookup
      if (!chatbot) {
        const response = await databases.listDocuments(
          clientConfig.appwrite.databaseId,
          clientConfig.appwrite.collections.chatbots,
          [
            Query.equal('namespace', [chatbotId]),
            Query.equal('userId', [user.$id]),
            Query.limit(1)
          ]
        )
        
        if (response.documents.length > 0) {
          chatbot = response.documents[0]
        }
      }
      
      if (!chatbot) {
        return NextResponse.json(
          { error: 'Chatbot not found or access denied' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: chatbot
      })
      
    } catch (error) {
      console.error('Database query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch chatbot' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Get chatbot error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const chatbotId = resolvedParams.id
    let updateData
    
    try {
      updateData = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

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
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get chatbot to verify ownership
    try {
      let chatbot = null
      
      // First try to get by document ID
      try {
        const directResponse = await databases.getDocument(
          clientConfig.appwrite.databaseId,
          clientConfig.appwrite.collections.chatbots,
          chatbotId
        )
        
        // Verify ownership
        if (directResponse.userId === user.$id) {
          chatbot = directResponse
        }
      } catch (error) {
        // If direct ID lookup fails, try namespace lookup
        console.log('Direct ID lookup failed, trying namespace lookup')
      }
      
      // If direct lookup failed or didn't match user, try namespace lookup
      if (!chatbot) {
        const response = await databases.listDocuments(
          clientConfig.appwrite.databaseId,
          clientConfig.appwrite.collections.chatbots,
          [
            Query.equal('namespace', [chatbotId]),
            Query.equal('userId', [user.$id]),
            Query.limit(1)
          ]
        )
        
        if (response.documents.length > 0) {
          chatbot = response.documents[0]
        }
      }
      
      if (!chatbot) {
        return NextResponse.json(
          { error: 'Chatbot not found or access denied' },
          { status: 404 }
        )
      }

      // Update chatbot with allowed fields
      const allowedUpdates: any = {
        lastUpdated: new Date().toISOString()
      }

      if (updateData.title) allowedUpdates.title = updateData.title
      if (updateData.description) allowedUpdates.description = updateData.description
      if (typeof updateData.isActive === 'boolean') allowedUpdates.isActive = updateData.isActive

      const updatedChatbot = await databases.updateDocument(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.chatbots,
        chatbot.$id,
        allowedUpdates
      )

      return NextResponse.json({
        success: true,
        data: updatedChatbot
      })
      
    } catch (error) {
      console.error('Database update error:', error)
      return NextResponse.json(
        { error: 'Failed to update chatbot' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Update chatbot error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const chatbotId = resolvedParams.id

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
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get chatbot to verify ownership
    try {
      let chatbot = null
      
      // First try to get by document ID
      try {
        const directResponse = await databases.getDocument(
          clientConfig.appwrite.databaseId,
          clientConfig.appwrite.collections.chatbots,
          chatbotId
        )
        
        // Verify ownership
        if (directResponse.userId === user.$id) {
          chatbot = directResponse
        }
      } catch (error) {
        // If direct ID lookup fails, try namespace lookup
        console.log('Direct ID lookup failed, trying namespace lookup')
      }
      
      // If direct lookup failed or didn't match user, try namespace lookup
      if (!chatbot) {
        const response = await databases.listDocuments(
          clientConfig.appwrite.databaseId,
          clientConfig.appwrite.collections.chatbots,
          [
            Query.equal('namespace', [chatbotId]),
            Query.equal('userId', [user.$id]),
            Query.limit(1)
          ]
        )
        
        if (response.documents.length > 0) {
          chatbot = response.documents[0]
        }
      }
      
      if (!chatbot) {
        return NextResponse.json(
          { error: 'Chatbot not found or access denied' },
          { status: 404 }
        )
      }

      // Delete the chatbot
      await databases.deleteDocument(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.chatbots,
        chatbot.$id
      )

      return NextResponse.json({
        success: true,
        message: 'Chatbot deleted successfully'
      })
      
    } catch (error) {
      console.error('Database delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete chatbot' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Delete chatbot error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 