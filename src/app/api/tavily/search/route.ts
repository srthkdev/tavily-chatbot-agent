import { NextRequest, NextResponse } from 'next/server'
import { serverConfig } from '@/config/tavily.config'
import { searchWeb } from '@/lib/tavily'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ratelimit = serverConfig.rateLimits.search
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

    const { 
      query, 
      maxResults = 10, 
      searchDepth = 'basic',
      includeImages = false,
      includeRawContent = true,
      includeAnswer = true,
      includeDomains,
      excludeDomains,
      topic = 'general'
    } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    if (query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters long' },
        { status: 400 }
      )
    }

    // Perform the search
    const searchResults = await searchWeb({
      query: query.trim(),
      maxResults: Math.min(maxResults, 20), // Cap at 20 results
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
    console.error('Search API error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('TAVILY_API_KEY')) {
        return NextResponse.json(
          { error: 'Search service is not configured' },
          { status: 503 }
        )
      }
      if (error.message.includes('Failed to search web content')) {
        return NextResponse.json(
          { error: 'Search service is temporarily unavailable' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Search request failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  
  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    )
  }

  // Convert GET request to POST format
  try {
    const mockRequest = {
      json: async () => ({
        query,
        maxResults: parseInt(searchParams.get('maxResults') || '10'),
        searchDepth: searchParams.get('searchDepth') || 'basic',
        includeImages: searchParams.get('includeImages') === 'true',
        includeRawContent: searchParams.get('includeRawContent') !== 'false',
        includeAnswer: searchParams.get('includeAnswer') !== 'false',
        topic: searchParams.get('topic') || 'general',
      }),
      headers: request.headers,
    } as NextRequest

    return await POST(mockRequest)
  } catch (error) {
    console.error('GET search error:', error)
    return NextResponse.json(
      { error: 'Search request failed' },
      { status: 500 }
    )
  }
} 