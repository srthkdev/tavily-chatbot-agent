import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, searchDepth = 'basic', maxResults = 5, includeFinancial = false } = body

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Check if Tavily API key is available
    if (!process.env.TAVILY_API_KEY) {
      console.warn('Tavily API key not found, returning mock data')
      return NextResponse.json({
        success: true,
        results: getMockSearchResults(query),
        source: 'mock_data'
      })
    }

    try {
      // Make real Tavily API call
      const tavilyResponse = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
        },
        body: JSON.stringify({
          query,
          search_depth: searchDepth,
          include_domains: includeFinancial 
            ? ['bloomberg.com', 'reuters.com', 'sec.gov', 'finance.yahoo.com', 'crunchbase.com', 'pitchbook.com']
            : undefined,
          max_results: maxResults,
          include_answer: true,
          include_raw_content: true
        })
      })

      if (!tavilyResponse.ok) {
        throw new Error(`Tavily API error: ${tavilyResponse.status}`)
      }

      const tavilyData = await tavilyResponse.json()

      return NextResponse.json({
        success: true,
        results: tavilyData.results || [],
        answer: tavilyData.answer,
        source: 'tavily_api'
      })

    } catch (error) {
      console.warn('Tavily API call failed, falling back to mock data:', error)
      return NextResponse.json({
        success: true,
        results: getMockSearchResults(query),
        source: 'mock_fallback'
      })
    }

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    )
  }
}

// Mock search results for fallback
function getMockSearchResults(query: string) {
  const companyName = extractCompanyName(query)
  
  return [
    {
      title: `${companyName} - Company Overview and Financial Information`,
      url: `https://finance.yahoo.com/quote/${companyName.toLowerCase().replace(/\s+/g, '-')}`,
      content: `${companyName} is a leading company with revenue of approximately $2.5B and 15,000 employees. Founded in 2010, the company is headquartered in San Francisco, CA. The company has shown strong growth in recent years with innovative products and market expansion.`,
      score: 0.95,
      published_date: new Date().toISOString()
    },
    {
      title: `${companyName} Financial Performance and Market Analysis`,
      url: `https://www.bloomberg.com/quote/${companyName.toLowerCase().replace(/\s+/g, '-')}`,
      content: `Financial analysis shows ${companyName} has demonstrated consistent revenue growth of 15% year-over-year. The company operates in the technology sector with strong competitive positioning and market leadership in key segments.`,
      score: 0.88,
      published_date: new Date().toISOString()
    },
    {
      title: `${companyName} - Corporate Information and Business Profile`,
      url: `https://www.reuters.com/companies/${companyName.toLowerCase().replace(/\s+/g, '-')}`,
      content: `${companyName} corporate profile including business operations, key executives, and market presence. The company has established strong partnerships and continues to innovate in its core markets.`,
      score: 0.82,
      published_date: new Date().toISOString()
    }
  ]
}

function extractCompanyName(query: string): string {
  // Simple extraction - in real implementation would be more sophisticated
  const words = query.split(' ')
  const stopWords = ['company', 'financial', 'data', 'revenue', 'employees', 'headquarters', 'founded', 'competitors']
  const companyWords = words.filter(word => 
    !stopWords.includes(word.toLowerCase()) && 
    word.length > 2 &&
    /^[A-Za-z]/.test(word)
  )
  
  return companyWords.slice(0, 2).join(' ') || 'Company'
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