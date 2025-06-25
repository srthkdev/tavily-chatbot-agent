import { NextRequest, NextResponse } from 'next/server'
import { searchWeb } from '@/lib/tavily'
import { serverConfig } from '@/config/tavily.config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      query,
      maxResults = 10,
      searchDepth = 'basic',
      includeImages = false,
      includeRawContent = false,
      includeAnswer = false,
      includeDomains,
      excludeDomains,
      topic = 'general'
    } = body

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Check rate limiting if enabled
    if (serverConfig.rateLimits.search) {
      const identifier = request.headers.get('x-forwarded-for') || 'anonymous'
      const result = await serverConfig.rateLimits.search.limit(identifier)
      
      if (!result.success) {
        return NextResponse.json({ 
          error: 'Rate limit exceeded',
          retryAfter: result.reset 
        }, { status: 429 })
      }
    }

    // Perform the search
    const searchResults = await searchWeb({
      query,
      maxResults: Math.min(maxResults, serverConfig.tavily.maxResults),
      searchDepth,
      includeImages,
      includeRawContent,
      includeAnswer,
      includeDomains,
      excludeDomains,
      topic,
    })

    return NextResponse.json({
      success: true,
      data: searchResults
    })

  } catch (error) {
    console.error('Tavily search API error:', error)
    
    if (error instanceof Error && error.message.includes('TAVILY_API_KEY')) {
      return NextResponse.json({ 
        error: 'Tavily API key is not configured' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      error: 'Failed to perform search' 
    }, { status: 500 })
  }
} 