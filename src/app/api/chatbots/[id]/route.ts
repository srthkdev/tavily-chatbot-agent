import { NextRequest, NextResponse } from 'next/server'
import { getChatbot, updateChatbot, deleteChatbot } from '@/lib/appwrite'
import { cookies } from 'next/headers'
import { Client, Account, Databases, Query } from 'node-appwrite'
import { clientConfig } from '@/config/tavily.config'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatbotId } = await context.params

    // Check authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('appwrite-session')
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Create client with session
    const client = new Client()
    client
      .setEndpoint(clientConfig.appwrite.endpoint)
      .setProject(clientConfig.appwrite.projectId)
      .setSession(sessionCookie.value)

    const account = new Account(client)

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

    // Get chatbot
    const chatbot = await getChatbot(chatbotId)

    if (!chatbot) {
      return NextResponse.json(
        { error: 'Chatbot not found' },
        { status: 404 }
      )
    }

    // Check if user owns this chatbot
    if (chatbot!.userId !== user.$id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: chatbot
    })

  } catch (error) {
    console.warn('Get chatbot error:', error)
    return NextResponse.json(
      { error: 'Chatbot not found' },
      { status: 404 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatbotId } = await context.params
    const updateData = await request.json()

    // Check authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('appwrite-session')
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Create client with session
    const client = new Client()
    client
      .setEndpoint(clientConfig.appwrite.endpoint)
      .setProject(clientConfig.appwrite.projectId)
      .setSession(sessionCookie.value)

    const account = new Account(client)

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

    // Get chatbot to verify ownership
    const chatbot = await getChatbot(chatbotId)

    if (!chatbot) {
      return NextResponse.json(
        { error: 'Chatbot not found' },
        { status: 404 }
      )
    }

    if (chatbot!.userId !== user.$id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Update chatbot
    const updatedChatbot = await updateChatbot(chatbotId, {
      name: updateData.name,
      description: updateData.description,
      status: updateData.status,
    })

    return NextResponse.json({
      success: true,
      data: updatedChatbot
    })

  } catch (error) {
    console.warn('Update chatbot error:', error)
    return NextResponse.json(
      { error: 'Failed to update chatbot' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    // Create client with session
    const client = new Client()
    client
      .setEndpoint(clientConfig.appwrite.endpoint)
      .setProject(clientConfig.appwrite.projectId)
      .setSession(sessionCookie.value)

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

    const { id: chatbotId } = await context.params

    // First, check if the chatbot exists and belongs to the user
    try {
      const chatbot = await databases.getDocument(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.chatbots,
        chatbotId
      )

      // Verify ownership
      if (chatbot.userId !== user.$id) {
        return NextResponse.json(
          { error: 'Access denied. You can only delete your own chatbots.' },
          { status: 403 }
        )
      }

      // Delete all conversations for this chatbot
      const conversations = await databases.listDocuments(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.conversations,
        [
          Query.equal('chatbotId', chatbotId)
        ]
      )

      // Delete all messages for each conversation
      for (const conversation of conversations.documents) {
        const messages = await databases.listDocuments(
          clientConfig.appwrite.databaseId,
          clientConfig.appwrite.collections.messages,
          [
            Query.equal('conversationId', conversation.$id)
          ]
        )

        // Delete messages
        for (const message of messages.documents) {
          await databases.deleteDocument(
            clientConfig.appwrite.databaseId,
            clientConfig.appwrite.collections.messages,
            message.$id
          )
        }

        // Delete conversation
        await databases.deleteDocument(
          clientConfig.appwrite.databaseId,
          clientConfig.appwrite.collections.conversations,
          conversation.$id
        )
      }

      // Finally, delete the chatbot
      await databases.deleteDocument(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.chatbots,
        chatbotId
      )

      return NextResponse.json({
        success: true,
        message: 'Chatbot deleted successfully'
      })

    } catch (error: any) {
      if (error.code === 404) {
        return NextResponse.json(
          { error: 'Chatbot not found' },
          { status: 404 }
        )
      }
      throw error
    }

  } catch (error) {
    console.warn('Delete chatbot error:', error)
    return NextResponse.json(
      { error: 'Failed to delete chatbot' },
      { status: 500 }
    )
  }
} 