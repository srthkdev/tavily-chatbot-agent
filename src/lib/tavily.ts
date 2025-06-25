import { tavily } from '@tavily/core'

export interface TavilySearchOptions {
  query: string
  maxResults?: number
  searchDepth?: 'basic' | 'advanced'
  includeImages?: boolean
  includeRawContent?: boolean
  includeAnswer?: boolean
  includeDomains?: string[]
  excludeDomains?: string[]
  topic?: 'general' | 'news'
}

export interface TavilySearchResult {
  url: string
  title: string
  content: string
  score: number
  rawContent?: string
}

export interface TavilySearchResponse {
  query: string
  answer?: string
  images?: Array<{
    url: string
    description?: string
  }>
  results: TavilySearchResult[]
  responseTime: number
}

export interface TavilyExtractOptions {
  urls: string[]
  includeImages?: boolean
  extractDepth?: 'basic' | 'advanced'
}

export interface TavilyExtractResult {
  url: string
  title?: string
  content?: string
  rawContent?: string
  images?: string[]
}

export interface TavilyExtractResponse {
  results: TavilyExtractResult[]
  failedResults: Array<{
    url: string
    error: string
  }>
  responseTime: number
}

// Initialize Tavily client
function createTavilyClient() {
  const apiKey = process.env.TAVILY_API_KEY
  
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable is required')
  }
  
  return tavily({ apiKey })
}

// Search the web using Tavily
export async function searchWeb(options: TavilySearchOptions): Promise<TavilySearchResponse> {
  const client = createTavilyClient()
  
  try {
    const response = await client.search(options.query, {
      maxResults: options.maxResults || 10,
      searchDepth: options.searchDepth || 'basic',
      includeImages: options.includeImages || false,
      includeRawContent: options.includeRawContent ? 'text' : false,
      includeAnswer: options.includeAnswer || false,
      includeDomains: options.includeDomains,
      excludeDomains: options.excludeDomains,
      topic: options.topic || 'general',
    })
    
    return {
      query: options.query,
      answer: response.answer,
      images: response.images || [],
      results: response.results.map((result: { url: string; title: string; content: string; score: number; rawContent?: string }) => ({
        url: result.url,
        title: result.title,
        content: result.content,
        score: result.score,
        rawContent: result.rawContent,
      })),
      responseTime: response.responseTime || 0,
    }
  } catch (error) {
    console.error('Tavily search error:', error)
    throw new Error('Failed to search web content')
  }
}

// Extract content from URLs using Tavily
export async function extractContent(options: TavilyExtractOptions): Promise<TavilyExtractResponse> {
  const client = createTavilyClient()
  
  try {
    const response = await client.extract(options.urls, {
      includeImages: options.includeImages || false,
      extractDepth: options.extractDepth || 'basic',
    })
    return {
      results: response.results.map((result: TavilyExtractResult) => ({
        url: result.url,
        title: result.title,
        content: result.content || result.rawContent || '',
        rawContent: result.rawContent,
        images: result.images || [],
      })),
      failedResults: response.failedResults || [],
      responseTime: response.responseTime || 0,
    }
  } catch (error) {
    console.error('Tavily extract error:', error)
    throw new Error('Failed to extract content from URLs')
  }
}

// Search and extract content for chatbot creation
export async function searchAndCreateBot(url: string, maxResults = 10): Promise<{
  namespace: string
  title: string
  description: string
  favicon?: string
  pagesCrawled: number
  content: Array<{
    url: string
    title: string
    content: string
    metadata?: Record<string, unknown>
  }>
}> {
  try {
    // First, try to extract content directly from the URL
    const extractResponse = await extractContent({
      urls: [url],
      includeImages: false,
      extractDepth: 'advanced',
    })
    
    if (extractResponse.results.length === 0) {
      throw new Error('Failed to extract content from the provided URL')
    }
    
    const mainContent = extractResponse.results[0]
    
    // Use the main URL content to search for related pages
    const searchQuery = `site:${new URL(url).hostname} ${mainContent.title || ''}`
    
    const searchResponse = await searchWeb({
      query: searchQuery,
      maxResults: maxResults - 1, // -1 because we already have the main page
      searchDepth: 'advanced',
      includeRawContent: true,
      includeDomains: [new URL(url).hostname],
    })
    
    // Combine main content with search results
    const allContent = [
      {
        url: mainContent.url,
        title: mainContent.title || 'Homepage',
        content: mainContent.content || mainContent.rawContent || '',
        metadata: {
          isMainPage: true,
          extractedAt: new Date().toISOString(),
        },
      },
      ...searchResponse.results.map(result => ({
        url: result.url,
        title: result.title,
        content: result.content,
        metadata: {
          score: result.score,
          searchedAt: new Date().toISOString(),
        },
      })),
    ]
    
    // Generate namespace and metadata
    const hostname = new URL(url).hostname.replace(/\./g, '-')
    const timestamp = Date.now()
    const namespace = `${hostname}-${timestamp}`
    
    return {
      namespace,
      title: mainContent.title || hostname,
      description: (mainContent.content || mainContent.rawContent || 'No description available').substring(0, 200) + '...',
      pagesCrawled: allContent.length,
      content: allContent,
    }
  } catch (error) {
    console.error('Search and create bot error:', error)
    throw new Error('Failed to create chatbot from URL')
  }
}

// Search for specific information within a context
export async function searchWithContext(
  query: string,
  context?: string,
  options?: Partial<TavilySearchOptions>
): Promise<TavilySearchResponse> {
  const enhancedQuery = context ? `${query} ${context}` : query
  
  return searchWeb({
    query: enhancedQuery,
    maxResults: options?.maxResults || 5,
    searchDepth: options?.searchDepth || 'basic',
    includeAnswer: true,
    includeRawContent: true,
    ...options,
  })
} 