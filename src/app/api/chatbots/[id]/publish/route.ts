import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite'
import { cookies } from 'next/headers'
import { clientConfig } from '@/config/tavily.config'
import { Query } from 'node-appwrite'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const resolvedParams = await params
    const chatbotId = resolvedParams.id

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { published } = body

    if (typeof published !== 'boolean') {
      return NextResponse.json(
        { error: 'Published field must be a boolean' },
        { status: 400 }
      )
    }

    // Get chatbot to verify ownership
    let chatbot
    try {
      const response = await databases.listDocuments(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.chatbots,
        [
          Query.equal('namespace', [chatbotId]),
          Query.equal('createdBy', [user.$id])
        ]
      )
      
      if (response.documents.length === 0) {
        return NextResponse.json(
          { error: 'Chatbot not found or access denied' },
          { status: 404 }
        )
      }
      
      chatbot = response.documents[0]
    } catch (error) {
      console.error('Database query error:', error)
      return NextResponse.json(
        { error: 'Failed to verify chatbot ownership' },
        { status: 500 }
      )
    }

    // Generate public URL if publishing
    let publicUrl = null
    if (published) {
      publicUrl = `/p/${chatbot.namespace}`
    }

    // Update chatbot publish status
    try {
      await databases.updateDocument(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.chatbots,
        chatbot.$id,
        {
          published: published,
          publicUrl: publicUrl,
          publishedAt: published ? new Date().toISOString() : null,
          lastUpdated: new Date().toISOString(),
        }
      )
    } catch (error) {
      console.error('Failed to update chatbot:', error)
      return NextResponse.json(
        { error: 'Failed to update chatbot publish status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      published: published,
      publicUrl: publicUrl,
      message: published 
        ? `Chatbot published successfully at ${publicUrl}` 
        : 'Chatbot unpublished successfully'
    })

  } catch (error) {
    console.error('Publish chatbot error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 