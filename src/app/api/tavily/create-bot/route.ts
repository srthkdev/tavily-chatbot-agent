import { NextRequest, NextResponse } from 'next/server'
import { serverConfig } from '@/config/tavily.config'
import { searchAndCreateBot } from '@/lib/tavily'
import { createChatbot, getCurrentUser } from '@/lib/appwrite'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ratelimit = serverConfig.rateLimits.create
    if (ratelimit) {
      const ip = (request.headers.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0]
      const { success, limit, reset, remaining } = await ratelimit.limit(ip)
      
      if (!success) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': new Date(reset).toISOString(),
            }
          }
        )
      }
    }

    const { url, name, description, maxResults = 10 } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    let normalizedUrl: string
    try {
      normalizedUrl = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`
      new URL(normalizedUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Check if features are enabled
    if (!serverConfig.features.enableCreation) {
      return NextResponse.json(
        { error: 'Chatbot creation is currently disabled' },
        { status: 403 }
      )
    }

    // Get current user if Appwrite is enabled
    let userId = null
    if (serverConfig.features.enableAppwrite) {
      try {
        // Set cookies for Appwrite client
        const cookieStore = await cookies()
        const sessionCookie = cookieStore.get('appwrite-session')
        if (sessionCookie) {
          const user = await getCurrentUser()
          userId = user?.$id
        }
      } catch (error) {
        console.log('No authenticated user, proceeding without user context')
      }
    }

    // Extract content using Tavily
    const tavilyResult = await searchAndCreateBot(normalizedUrl, maxResults)

    // Create chatbot object
    const chatbotData = {
      namespace: tavilyResult.namespace,
      name: name || tavilyResult.title,
      description: description || tavilyResult.description,
      url: normalizedUrl,
      favicon: tavilyResult.favicon,
      status: 'active' as const,
      pagesCrawled: tavilyResult.pagesCrawled,
      userId: userId || 'anonymous',
      metadata: {
        content: tavilyResult.content,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      }
    }

    // Save to Appwrite if enabled
    let savedChatbot = null
    if (serverConfig.features.enableAppwrite && userId) {
      try {
        savedChatbot = await createChatbot(chatbotData)
      } catch (error) {
        console.error('Failed to save chatbot to Appwrite:', error)
        // Continue without saving - return the data anyway
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      chatbot: savedChatbot || {
        id: tavilyResult.namespace,
        ...chatbotData,
        $id: tavilyResult.namespace,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })

  } catch (error) {
    console.error('Error creating chatbot:', error)
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('TAVILY_API_KEY')) {
        return NextResponse.json(
          { error: 'Search service is not configured. Please contact support.' },
          { status: 503 }
        )
      }
      if (error.message.includes('Failed to extract content')) {
        return NextResponse.json(
          { error: 'Unable to extract content from the provided URL. Please check the URL and try again.' },
          { status: 400 }
        )
      }
      if (error.message.includes('Failed to search web content')) {
        return NextResponse.json(
          { error: 'Search service is temporarily unavailable. Please try again later.' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create chatbot. Please try again.' },
      { status: 500 }
    )
  }
} 