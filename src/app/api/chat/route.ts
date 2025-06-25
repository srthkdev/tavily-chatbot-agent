import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { serverConfig } from '@/config/tavily.config'
import { searchWithContext } from '@/lib/tavily'
import { getMemoryContext, addConversationTurn } from '@/lib/mem0'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      messages, 
      user_id, 
      // conversation_id, // Not yet implemented
      use_search = true,
      search_query,
      max_results = 5 
    } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    // Get the latest user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()
    if (!lastUserMessage) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 })
    }

    const userQuery = lastUserMessage.content
    let contextualPrompt = userQuery
    let searchResults = null
    let memoryContext = ''

    // Get memory context if user_id is provided
    if (user_id && serverConfig.features.enableMem0) {
      try {
        memoryContext = await getMemoryContext(userQuery, { user_id }, 5)
      } catch (error) {
        console.error('Memory context error:', error)
      }
    }

    // Perform web search if requested
    if (use_search) {
      try {
        const queryToSearch = search_query || userQuery
        searchResults = await searchWithContext(queryToSearch, '', {
          maxResults: max_results,
          searchDepth: 'basic',
          includeAnswer: true,
          includeRawContent: true,
        })

        // Build context from search results
        if (searchResults.results.length > 0) {
          const searchContext = searchResults.results
            .map((result, index) => 
              `[${index + 1}] ${result.title}\n${result.content}\nSource: ${result.url}\n`
            )
            .join('\n')

          contextualPrompt = `Based on the following search results, please answer the user's question: "${userQuery}"

Search Results:
${searchContext}

${memoryContext ? `\n${memoryContext}` : ''}

Please provide a comprehensive answer based on the search results above. Include relevant sources when appropriate.`
        }
      } catch (error) {
        console.error('Search error:', error)
        // Continue without search results
      }
    }

    // Prepare messages for AI
    const systemPrompt = `${serverConfig.ai.systemPrompt}${memoryContext ? `\n\n${memoryContext}` : ''}`
    
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(0, -1), // Previous messages
      { role: 'user', content: contextualPrompt }
    ]

    // Check if we have an AI model available
    let model
    try {
      model = serverConfig.ai.model
      if (!model) {
        throw new Error('No AI model available')
      }
    } catch {
      return NextResponse.json({ 
        error: 'AI service is not configured. Please set at least one AI provider API key.' 
      }, { status: 500 })
    }

    // Generate streaming response
    const result = await streamText({
      model,
      messages: aiMessages,
      temperature: serverConfig.ai.temperature,
      maxTokens: serverConfig.ai.maxTokens,
    })

    // Create a custom response that includes search metadata
    const customResponse = new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          
          // Send initial metadata if we have search results
          if (searchResults) {
            const metadata = JSON.stringify({
              type: 'metadata',
              searchResults: {
                query: searchResults.query,
                answer: searchResults.answer,
                sources: searchResults.results.map(r => ({
                  title: r.title,
                  url: r.url,
                  snippet: r.content.substring(0, 200) + '...'
                }))
              }
            }) + '\n'
            
            controller.enqueue(encoder.encode(`data: ${metadata}\n\n`))
          }

          // Stream the AI response
          for await (const textPart of result.textStream) {
            const chunk = JSON.stringify({
              type: 'text',
              content: textPart
            }) + '\n'
            
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
          }

          // Get the full response text for memory storage
          const fullResponse = await result.text

          // Store conversation in memory if user_id is provided
          if (user_id && serverConfig.features.enableMem0) {
            try {
              await addConversationTurn(userQuery, fullResponse, { user_id })
            } catch (error) {
              console.error('Memory storage error:', error)
            }
          }

          // Send completion signal
          const completion = JSON.stringify({
            type: 'done',
            usage: result.usage
          }) + '\n'
          
          controller.enqueue(encoder.encode(`data: ${completion}\n\n`))
          controller.close()
        }
      }),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    )

    return customResponse

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 