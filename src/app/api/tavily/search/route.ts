import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, maxResults = 10, searchDepth = 'basic', includeAnswer = true, includeImages = false, includeRawContent = true } = body

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Check rate limit
    const clientIP = request.headers.get('x-forwarded-for') || 'anonymous'
    const rateLimit = await checkRateLimit('search', clientIP)
    
    if (!rateLimit.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        }, 
        { status: 429 }
      )
    }

    // Get API key from environment or request headers
    const apiKey = process.env.TAVILY_API_KEY || request.headers.get('X-Tavily-API-Key')
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Tavily API key is not configured' },
        { status: 500 }
      )
    }

    // Make request to Tavily API
    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: searchDepth,
        include_answer: includeAnswer,
        include_images: includeImages,
        include_raw_content: includeRawContent,
        max_results: Math.min(maxResults, 20), // Cap at 20 for API limits
      }),
    })

    if (!tavilyResponse.ok) {
      const errorText = await tavilyResponse.text()
      console.error('Tavily API error:', errorText)
      
      if (tavilyResponse.status === 401) {
        return NextResponse.json(
          { error: 'Invalid Tavily API key' },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: 'Search failed', details: errorText },
        { status: tavilyResponse.status }
      )
    }

    const data = await tavilyResponse.json()

    return NextResponse.json({
      success: true,
      query,
      answer: data.answer,
      results: data.results || [],
      images: data.images || [],
      searchTime: data.search_time || 0,
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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