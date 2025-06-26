import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { checkRateLimit } from '@/lib/rate-limit'
import { searchDocuments } from '@/lib/upstash-search'
import { serverConfig as config } from '@/config/tavily.config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, namespace, useWebSearch = false, maxResults = 5 } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]
    if (!lastMessage?.content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Check rate limit
    const clientIP = request.headers.get('x-forwarded-for') || 'anonymous'
    const rateLimit = await checkRateLimit('query', clientIP)
    
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

    // Get AI model
    const model = config.ai.model
    if (!model) {
      return NextResponse.json(
        { error: 'No AI provider configured' },
        { status: 500 }
      )
    }

    let contextSources: any[] = []
    let systemContext = ''

    // If namespace is provided, search the vector database
    if (namespace) {
      try {
        const searchResults = await searchDocuments(
          lastMessage.content,
          namespace,
          Math.min(maxResults, config.search.maxContextDocs)
        )

        if (searchResults.length > 0) {
          contextSources = searchResults.map((result, index) => ({
            id: result.id,
            url: result.metadata.sourceURL || result.metadata.url,
            title: result.metadata.pageTitle || result.metadata.title,
            snippet: result.metadata.fullContent?.substring(0, config.search.snippetLength) || '',
            score: result.score,
            index: index + 1
          }))

          // Create context from search results
          const contextContent = searchResults
            .slice(0, config.search.maxContextDocs)
            .map((result, index) => {
              const content = result.metadata.fullContent || result.content?.text || ''
              const truncated = content.substring(0, config.search.maxContextLength)
              return `[${index + 1}] ${result.metadata.title}\nURL: ${result.metadata.sourceURL}\nContent: ${truncated}\n`
            })
            .join('\n')

          systemContext = `Based on the following website content, please answer the user's question. Use the provided context to give accurate information and cite sources using [1], [2], etc. where appropriate.

Website Content:
${contextContent}

If the context doesn't contain enough information to answer the question fully, say so and suggest what additional information might be needed.`
        }
      } catch (searchError) {
        console.error('Vector search error:', searchError)
        // Continue without context rather than failing
      }
    }

    // If no context from vector search or web search is requested, use Tavily
    if (!systemContext && (useWebSearch || !namespace)) {
      try {
        const apiKey = process.env.TAVILY_API_KEY || request.headers.get('X-Tavily-API-Key')
        
        if (apiKey) {
          const tavilyResponse = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              query: lastMessage.content,
              search_depth: 'basic',
              include_answer: true,
              include_images: false,
              include_raw_content: true,
              max_results: 5,
            }),
          })

          if (tavilyResponse.ok) {
            const searchData = await tavilyResponse.json()
            const results = searchData.results || []
            
            if (results.length > 0) {
              contextSources = results.map((result: any, index: number) => ({
                id: `web-${index}`,
                url: result.url,
                title: result.title,
                snippet: result.content?.substring(0, config.search.snippetLength) || '',
                score: 1.0,
                index: index + 1
              }))

              const webContext = results
                .slice(0, 5)
                .map((result: any, index: number) => {
                  const content = result.content || ''
                  const truncated = content.substring(0, config.search.maxContextLength)
                  return `[${index + 1}] ${result.title}\nURL: ${result.url}\nContent: ${truncated}\n`
                })
                .join('\n')

              systemContext = `Based on the following web search results, please answer the user's question. Use the provided context to give accurate information and cite sources using [1], [2], etc. where appropriate.

Web Search Results:
${webContext}

${searchData.answer ? `\nDirect Answer: ${searchData.answer}` : ''}`
            }
          }
        }
      } catch (webSearchError) {
        console.error('Web search error:', webSearchError)
        // Continue without web context
      }
    }

    // Prepare messages for AI
    const systemPrompt = systemContext || config.ai.systemPrompt
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]

    // Stream the response
    const result = await streamText({
      model,
      messages: aiMessages,
      temperature: config.ai.temperature,
      maxTokens: config.ai.maxTokens,
    })

    // Add sources to the response if available
    const response = new Response(result.toDataStreamResponse().body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Sources': contextSources.length > 0 ? JSON.stringify(contextSources) : '',
      }
    })

    return response

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 