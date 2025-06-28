import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite'
import { clientConfig } from '@/config/tavily.config'
import { Query } from 'node-appwrite'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chatbotId = params.id

    if (!chatbotId) {
      return NextResponse.json(
        { error: 'Chatbot ID is required' },
        { status: 400 }
      )
    }

    // Create admin client (no authentication required for public access)
    const { databases } = createAdminClient()

    // Get published chatbot
    try {
      const response = await databases.listDocuments(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.chatbots,
        [
          Query.equal('namespace', [chatbotId]),
          Query.equal('published', [true]),
          Query.limit(1)
        ]
      )
      
      if (response.documents.length === 0) {
        return NextResponse.json(
          { error: 'Chatbot not found or not published' },
          { status: 404 }
        )
      }
      
      const chatbot = response.documents[0]
      
      // Return only public-safe information
      const publicChatbot = {
        id: chatbot.$id,
        namespace: chatbot.namespace,
        title: chatbot.title,
        description: chatbot.description,
        companyName: chatbot.companyName || chatbot.title,
        domain: chatbot.domain,
        industry: chatbot.industry || 'general',
        published: chatbot.published,
        createdAt: chatbot.createdAt,
        pagesCrawled: chatbot.pagesCrawled,
        documentsStored: chatbot.documentsStored,
      }

      return NextResponse.json({
        success: true,
        data: publicChatbot
      })
      
    } catch (error) {
      console.error('Database query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch chatbot' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Get public chatbot error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 