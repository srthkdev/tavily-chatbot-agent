import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { upsertDocuments, SearchDocument } from '@/lib/upstash-search'
import { saveIndex } from '@/lib/storage'
import { serverConfig as config } from '@/config/tavily.config'
import { getCurrentUser, createChatbot } from '@/lib/appwrite'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Check if creation is disabled
    if (!config.features.enableCreation) {
      return NextResponse.json({ 
        error: 'Chatbot creation is currently disabled. You can only view existing chatbots.' 
      }, { status: 403 })
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

    // Get current user
    const user = await getCurrentUser()
    
    if (!user) {
      cookieStore.delete('appwrite-session')
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    let body;
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    
    const { url, maxResults = config.tavily.defaultLimit, searchDepth = config.tavily.searchDepth } = body
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Check rate limit
    const clientIP = request.headers.get('x-forwarded-for') || 'anonymous'
    const rateLimit = await checkRateLimit('create', clientIP)
    
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

    // Generate unique namespace with timestamp to avoid collisions
    const baseNamespace = new URL(url).hostname.replace(/\./g, '-')
    const timestamp = Date.now()
    const namespace = `${baseNamespace}-${timestamp}`
    
    // Get API key from environment or request headers
    const apiKey = process.env.TAVILY_API_KEY || request.headers.get('X-Tavily-API-Key')
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Tavily API key is not configured. Please provide your API key.' 
      }, { status: 500 })
    }

    // Search for content related to the URL
    const searchQuery = `site:${new URL(url).hostname} OR ${url}`
    
    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: searchQuery,
        search_depth: searchDepth,
        include_answer: false,
        include_images: false,
        include_raw_content: true,
        max_results: Math.min(maxResults, 50), // Cap for performance
      }),
    })

    if (!tavilyResponse.ok) {
      const errorText = await tavilyResponse.text()
      console.error('Tavily API error:', errorText)
      
      if (tavilyResponse.status === 401) {
        return NextResponse.json(
          { error: 'Tavily authentication failed. Please check your API key.' },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to search content', details: errorText },
        { status: tavilyResponse.status }
      )
    }

    const searchData = await tavilyResponse.json()
    const results = searchData.results || []

    if (results.length === 0) {
      return NextResponse.json({
        error: 'No content found for the provided URL. Try a different website or check if the URL is accessible.',
      }, { status: 404 })
    }

    // Process search results and create documents for vector storage
    const documents: SearchDocument[] = []
    
    for (let index = 0; index < results.length; index++) {
      const result = results[index]
      const title = result.title || 'Untitled'
      const content = result.content || result.raw_content || ''
      const resultUrl = result.url || url
      
      // Create searchable text for embedding
      const searchableText = `${title} ${content}`.substring(0, 2000) // Limit for embedding
      
      documents.push({
        id: `${namespace}-${index}`,
        data: searchableText, // Use text directly for embedding model
        metadata: {
          namespace,
          title,
          url: resultUrl,
          sourceURL: resultUrl,
          crawlDate: new Date().toISOString(),
          pageTitle: title,
          description: content.substring(0, 200),
          favicon: undefined,
          ogImage: undefined,
          fullContent: content.substring(0, 5000),
          text: searchableText,
          score: result.score,
          publishedDate: result.published_date,
        }
      })
    }

    if (documents.length === 0) {
      return NextResponse.json({
        error: 'Failed to process any documents for vector storage.',
      }, { status: 500 })
    }

    // Store documents in Upstash Vector DB
    try {
      await upsertDocuments(documents)
      console.log(`Successfully stored ${documents.length} documents for namespace: ${namespace}`)
      
      // Verify storage by searching for one document (optional verification)
      try {
        const { searchDocuments } = await import('@/lib/upstash-search')
        const verifyResult = await searchDocuments('test', namespace, 1)
        
        if (verifyResult.length === 0) {
          console.warn('Documents may not have been stored properly, but continuing...')
        } else {
          console.log('Document storage verified successfully')
        }
      } catch (verifyError) {
        console.warn('Document verification failed, but continuing:', verifyError)
        // Don't throw here - verification failure shouldn't stop the process
      }
    } catch (upsertError) {
      console.error('Failed to store documents:', upsertError)
      const errorMessage = upsertError instanceof Error ? upsertError.message : 'Unknown error'
      
      // Only throw for critical storage failures
      if (errorMessage.includes('Failed to store documents')) {
        throw new Error(`Failed to store documents: ${errorMessage}`)
      } else {
        // For embedding-related errors, continue without vector storage
        console.warn('Vector storage not available, continuing without search functionality')
      }
    }

    // Find the best result for metadata (preferably the exact URL match)
    const homepage = results.find((result: any) => {
      const resultUrl = result.url || ''
      return resultUrl === url || resultUrl === url + '/' || resultUrl === url.replace(/\/$/, '')
    }) || results[0]

    // Save chatbot to database
    let chatbot = null
    try {
      chatbot = await createChatbot({
        userId: user.$id,
        namespace,
        name: homepage?.title || new URL(url).hostname,
        description: homepage?.content?.substring(0, 200) || `AI chatbot for ${new URL(url).hostname}`,
        url,
        favicon: undefined,
        status: 'active',
        pagesCrawled: documents.length.toString()
      })
    } catch (dbError) {
      console.error('Failed to save chatbot to database:', dbError)
      // Continue - we'll save to local storage as fallback
    }

    // Save index metadata to localStorage/Redis as fallback
    try {
      await saveIndex({
        url,
        namespace,
        pagesCrawled: documents.length,
        createdAt: new Date().toISOString(),
        metadata: {
          title: homepage?.title || new URL(url).hostname,
          description: homepage?.content?.substring(0, 200) || `AI chatbot for ${new URL(url).hostname}`,
          favicon: undefined,
          ogImage: undefined
        }
      })
    } catch (saveError) {
      console.error('Failed to save index metadata:', saveError)
      // Continue execution - storage error shouldn't fail the entire operation
    }

    return NextResponse.json({
      success: true,
      namespace,
      message: `Search completed successfully (processed ${documents.length} results)`,
      chatbot: chatbot || {
        url,
        namespace,
        pagesCrawled: documents.length,
        createdAt: new Date().toISOString(),
        metadata: {
          title: homepage?.title || new URL(url).hostname,
          description: homepage?.content?.substring(0, 200) || `AI chatbot for ${new URL(url).hostname}`,
          favicon: undefined,
          ogImage: undefined
        }
      },
      details: {
        url,
        resultsLimit: maxResults,
        resultsFound: results.length,
        documentsProcessed: documents.length,
        searchDepth: searchDepth
      },
      data: results.map((result: any) => ({
        url: result.url,
        title: result.title,
        content: result.content?.substring(0, 500), // Truncate for response
        published_date: result.published_date,
        score: result.score
      }))
    })

  } catch (error) {
    console.error('Create bot error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { 
        error: 'Failed to create chatbot',
        details: errorMessage
      },
      { status: 500 }
    )
  }
} 