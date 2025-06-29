import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import { searchWeb } from '@/lib/tavily'
import { addConversationTurn, getMemoryContext } from '@/lib/mem0'
import { searchDocuments } from '@/lib/upstash-search'

// Initialize OpenAI with GPT-4.1 (gpt-4-turbo-preview or latest available)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Cache for search results to prevent duplicate requests
const searchCache = new Map<string, { results: Array<{
  id: string
  title: string
  url: string
  snippet: string
  domain: string
  type: 'tavily' | 'mem0' | 'rag'
  score?: number
  content?: string
  sourceType?: string
}>, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  companyName: string
  companyData?: Record<string, unknown>
  chatbotId?: string
  namespace?: string
  capabilities?: {
    tavily: boolean
    mem0: boolean
    rag: boolean
    langgraph: boolean
  }
}

// Enhanced Tavily search with caching and debouncing
const searchWithTavily = async (query: string, companyName: string) => {
  try {
    // Create cache key
    const cacheKey = `${query}-${companyName}`.toLowerCase()
    
    // Check cache first
    const cached = searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Using cached Tavily results for:', cacheKey)
      return cached.results
    }
    
    // Only search if not cached
    const searchResult = await searchWeb({
      query: `${query} ${companyName}`,
      maxResults: 3, // Reduced from 5 to minimize API calls
      searchDepth: 'basic', // Changed from advanced to reduce processing time
      includeRawContent: false, // Reduced content to speed up
    })
    
    const results = searchResult.results.map((result, index) => ({
      id: `tavily-${index}`,
      title: result.title,
      url: result.url,
      snippet: result.content.substring(0, 200),
      domain: new URL(result.url).hostname,
      type: 'tavily' as const
    }))
    
    // Cache the results
    searchCache.set(cacheKey, { results, timestamp: Date.now() })
    
    return results
  } catch (error) {
    console.warn('Tavily search failed:', error)
    return []
  }
}

// Enhanced Mem0 memory search
const searchMemory = async (query: string, chatbotId?: string) => {
  try {
    if (!chatbotId) return []
    
    const memoryContext = await getMemoryContext(query, { user_id: chatbotId })
    if (!memoryContext) return []
    
    return [{
      id: 'mem0-context',
      title: 'Previous Conversation Context',
      url: '#memory',
      snippet: memoryContext.substring(0, 200),
      domain: 'memory',
      type: 'mem0' as const
    }]
  } catch (error) {
    console.warn('Memory search failed:', error)
    return []
  }
}

// Enhanced RAG search using the vector database with scraped documents
const searchRAG = async (query: string, namespace?: string) => {
  try {
    if (!namespace) return []
    
    // Search the vector database for relevant documents
    const ragResults = await searchDocuments(query, namespace, 10)
    
    return ragResults.map((result, index) => ({
      id: `rag-${index}`,
      title: result.metadata?.title || 'Company Document',
      url: result.metadata?.url || '#',
      snippet: result.metadata?.text?.substring(0, 200) || result.metadata?.description?.substring(0, 200) || 'No content available',
      domain: result.metadata?.sourceURL ? new URL(result.metadata.sourceURL).hostname : 'company-docs',
      type: 'rag' as const,
      score: result.score,
      content: result.metadata?.text || result.metadata?.description || '',
      sourceType: result.metadata?.sourceType || 'website'
    }))
  } catch (error) {
    console.warn('RAG search failed:', error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, companyName, companyData, chatbotId, namespace, capabilities } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]?.content || ''
    
    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Step 1: Multi-source information gathering
          const allSources: Array<{
            id: string
            title: string
            url: string
            snippet: string
            domain: string
            type: 'tavily' | 'mem0' | 'rag'
            score?: number
            content?: string
            sourceType?: string
          }> = []
          
          const searchPromises = []
          
          // RAG search (highest priority - company's own documents)
          if (capabilities?.rag !== false && namespace) {
            searchPromises.push(
              searchRAG(lastMessage, namespace).then(results => {
                allSources.push(...results)
                if (results.length > 0) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'status',
                    message: `Found ${results.length} relevant company documents`
                  })}\n\n`))
                }
              })
            )
          }

          // Tavily web search for real-time information
          if (capabilities?.tavily !== false && companyName) {
            searchPromises.push(
              searchWithTavily(lastMessage, companyName).then(results => {
                allSources.push(...results)
                if (results.length > 0) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'status', 
                    message: `Retrieved ${results.length} real-time web sources`
                  })}\n\n`))
                }
              })
            )
          }

          // Mem0 memory search for conversation context
          if (capabilities?.mem0 !== false && chatbotId) {
            searchPromises.push(
              searchMemory(lastMessage, chatbotId).then(results => {
                allSources.push(...results)
                if (results.length > 0) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'status',
                    message: 'Retrieved conversation context from memory'
                  })}\n\n`))
                }
              })
            )
          }

          // Wait for all searches to complete
          await Promise.all(searchPromises)

          // Send sources to client
          if (allSources.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'sources',
              sources: allSources
            })}\n\n`))
          }

          // Step 2: Prepare enhanced context for GPT-4.1
          let enhancedContext = ''
          
          // Add RAG context (company documents)
          const ragSources = allSources.filter(s => s.type === 'rag')
          if (ragSources.length > 0) {
            enhancedContext += '\n\n## Company Knowledge Base:\n'
            ragSources.forEach((source, index) => {
              enhancedContext += `[${index + 1}] ${source.title}\n`
              enhancedContext += `Source: ${source.url}\n`
              enhancedContext += `Content: ${source.content || source.snippet}\n\n`
            })
          }

          // Add web search context
          const webSources = allSources.filter(s => s.type === 'tavily')
          if (webSources.length > 0) {
            enhancedContext += '\n\n## Real-Time Web Information:\n'
            webSources.forEach((source, index) => {
              enhancedContext += `[${ragSources.length + index + 1}] ${source.title}\n`
              enhancedContext += `Source: ${source.url}\n`
              enhancedContext += `Content: ${source.snippet}\n\n`
            })
          }

          // Add memory context
          const memorySources = allSources.filter(s => s.type === 'mem0')
          if (memorySources.length > 0) {
            enhancedContext += '\n\n## Previous Conversation Context:\n'
            memorySources.forEach(source => {
              enhancedContext += `${source.snippet}\n\n`
            })
          }

          // Step 3: Prepare system message for company-specific assistant
          const systemMessage = `You are an AI assistant representing ${companyName}. You have access to:

1. **Company Knowledge Base**: Internal documents and website content
2. **Real-Time Web Data**: Latest news and information via Tavily API  
3. **Conversation Memory**: Previous discussion context via Mem0
4. **Advanced Reasoning**: GPT-4.1 capabilities

## Company Context:
${companyData ? `
- Company: ${companyData.name}
- Website: ${companyData.url || 'N/A'}
- Industry: ${companyData.industry || 'N/A'}
- Location: ${companyData.hqLocation || 'N/A'}
` : ''}

## Guidelines:
- Act as the official ${companyName} AI assistant
- Use "we", "our", and "us" when referring to ${companyName}
- Prioritize information from the company knowledge base
- Supplement with real-time web data when needed
- Reference conversation history for context
- Always cite sources using [1], [2], etc.
- Provide comprehensive, helpful responses
- Create tables and charts when displaying comparative data
- Be professional and knowledgeable about the company

## Available Information:
${enhancedContext}

Remember to cite your sources and provide accurate, helpful information about ${companyName}.`

          // Step 4: Generate response using GPT-4.1
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            message: 'Generating comprehensive response with GPT-4.1...'
          })}\n\n`))

          const chatCompletion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview', // Latest GPT-4.1 model
            messages: [
              { role: 'system', content: systemMessage },
              ...messages.slice(-5), // Keep last 5 messages for context
            ],
            max_tokens: 2000,
            temperature: 0.7,
            stream: true,
          })

          // Step 5: Stream the response
          let fullResponse = ''
          for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              fullResponse += content
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'content',
                content: fullResponse
              })}\n\n`))
            }
          }

          // Step 6: Save conversation to memory
          if (capabilities?.mem0 !== false && chatbotId && fullResponse) {
            try {
              await addConversationTurn(
                lastMessage,
                fullResponse,
                { user_id: chatbotId }
              )
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'capabilities',
                capabilities: [
                  ...(ragSources.length > 0 ? ['RAG Search'] : []),
                  ...(webSources.length > 0 ? ['Real-time Web Search'] : []),
                  ...(memorySources.length > 0 ? ['Conversation Memory'] : []),
                  'GPT-4.1 Reasoning'
                ]
              })}\n\n`))
            } catch (error) {
              console.warn('Failed to save to memory:', error)
            }
          }

          // End stream
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

        } catch (error) {
          console.error('Chat processing error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'Failed to process your request. Please try again.'
          })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 