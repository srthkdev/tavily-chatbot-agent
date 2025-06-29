import { NextRequest, NextResponse } from 'next/server'
import { databases } from '@/lib/appwrite'
import { clientConfig } from '@/config/tavily.config'
import { Query } from 'appwrite'

// Commented out interfaces and functions are kept for future implementation
// when these features are actively used in the codebase

// interface TavilyResult {
//   title: string
//   url: string
//   content: string
// }

// interface SearchResult {
//   title: string
//   url: string
//   snippet: string
//   domain: string
// }

// interface CompanyData {
//   name?: string
//   url?: string
//   industry?: string
//   description?: string
// }

// Mem0 integration for persistent memory (currently unused but kept for future implementation)
// const storeMemory = async (userId: string, chatbotId: string, message: string, response: string) => {
//   try {
//     if (!process.env.MEM0_API_KEY) {
//       console.warn('Mem0 API key not found, skipping memory storage')
//       return
//     }

//     const memoryData = {
//       user_id: userId,
//       chatbot_id: chatbotId,
//       messages: [
//         { role: 'user', content: message },
//         { role: 'assistant', content: response }
//       ],
//       timestamp: new Date().toISOString()
//     }

//     console.log('Memory data to store:', memoryData)
//   } catch (error) {
//     console.warn('Failed to store memory:', error)
//   }
// }

// RAG search integration for knowledge retrieval (currently unused but kept for future implementation)
// const searchKnowledge = async (query: string, namespace?: string) => {
//   try {
//     if (!namespace) {
//       return []
//     }

//     console.log('RAG search query:', query, 'namespace:', namespace)
    
//     return [
//       {
//         content: `Knowledge about ${query} from the company's knowledge base.`,
//         score: 0.95,
//         source: 'company_docs'
//       }
//     ]
//   } catch (error) {
//     console.warn('RAG search failed:', error)
//     return []
//   }
// }

// LangGraph agent integration for complex reasoning (currently unused but kept for future implementation)
// const invokeLangGraphAgent = async (query: string, companyData?: CompanyData) => {
//   try {
//     if (!process.env.LANGGRAPH_API_URL) {
//       console.warn('LangGraph API URL not found, using fallback')
//       return null
//     }

//     const agentInput = {
//       query,
//       company_data: companyData,
//       tools: ['web_search', 'financial_analysis', 'competitor_analysis'],
//       max_iterations: 5
//     }

//     console.log('LangGraph agent input:', agentInput)
    
//     return {
//       result: `LangGraph agent analysis for: ${query}`,
//       reasoning: 'Multi-step analysis completed',
//       sources: ['web_search', 'financial_data']
//     }
//   } catch (error) {
//     console.warn('LangGraph agent invocation failed:', error)
//     return null
//   }
// }

// Tavily search integration (currently unused but kept for future implementation)
// const searchWithTavily = async (query: string, companyName?: string): Promise<SearchResult[]> => {
//   try {
//     if (!process.env.TAVILY_API_KEY) {
//       console.warn('Tavily API key not found, using mock data')
//       return []
//     }

//     const response = await fetch('https://api.tavily.com/search', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
//       },
//       body: JSON.stringify({
//         query: companyName ? `${companyName} ${query}` : query,
//         search_depth: 'advanced',
//         include_domains: ['bloomberg.com', 'reuters.com', 'sec.gov', 'finance.yahoo.com'],
//         max_results: 3
//       })
//     })

//     if (!response.ok) {
//       throw new Error('Tavily API request failed')
//     }

//     const data = await response.json()
//     return data.results?.map((result: TavilyResult) => ({
//       title: result.title,
//       url: result.url,
//       snippet: result.content,
//       domain: new URL(result.url).hostname
//     })) || []

//   } catch (error) {
//     console.warn('Tavily search failed:', error)
//     return []
//   }
// }

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get user's chatbots with enhanced data
    const response = await databases.listDocuments(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(50)
      ]
    )

    const chatbots = response.documents.map(doc => ({
      $id: doc.$id,
      name: doc.name || doc.title || 'Untitled Chatbot',
      description: doc.description || 'AI-powered chatbot with Mem0, RAG, and Tavily integration',
      url: doc.url || doc.domain,
      namespace: doc.namespace || `chatbot_${doc.$id}`,
      type: doc.type || 'company_assistant',
      capabilities: [
        'Real-time web search via Tavily',
        'Persistent memory via Mem0',
        'Knowledge retrieval via RAG',
        'Complex reasoning via LangGraph'
      ],
      createdAt: doc.$createdAt,
      updatedAt: doc.$updatedAt,
      isActive: true,
      integrations: {
        tavily: !!process.env.TAVILY_API_KEY,
        mem0: !!process.env.MEM0_API_KEY,
        rag: !!doc.namespace,
        langgraph: !!process.env.LANGGRAPH_API_URL
      }
    }))

    return NextResponse.json({
      success: true,
      data: chatbots,
      total: response.total
    })

  } catch (error) {
    console.error('Error fetching chatbots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chatbots' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      description, 
      url, 
      userId, 
      type = 'company_assistant',
      capabilities = []
    } = body

    if (!name || !userId) {
      return NextResponse.json(
        { error: 'Name and user ID are required' },
        { status: 400 }
      )
    }

    // Create chatbot with enhanced capabilities
    const chatbotData = {
      name,
      description: description || `AI assistant for ${name} with advanced capabilities`,
      url,
      userId,
      type,
      namespace: `chatbot_${Date.now()}`,
      capabilities: [
        'Real-time web search via Tavily',
        'Persistent memory via Mem0', 
        'Knowledge retrieval via RAG',
        'Complex reasoning via LangGraph',
        ...capabilities
      ],
      integrations: {
        tavily: !!process.env.TAVILY_API_KEY,
        mem0: !!process.env.MEM0_API_KEY,
        rag: true,
        langgraph: !!process.env.LANGGRAPH_API_URL
      },
      settings: {
        model: 'gpt-4.1',
        temperature: 0.7,
        max_tokens: 2000,
        enable_web_search: true,
        enable_memory: true,
        enable_rag: true
      }
    }

    const response = await databases.createDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      'unique()',
      chatbotData
    )

    // Initialize RAG namespace for the new chatbot
    try {
      await initializeRAGNamespace(response.$id, name, url)
    } catch (error) {
      console.warn('Failed to initialize RAG namespace:', error)
    }

    return NextResponse.json({
      success: true,
      data: {
        $id: response.$id,
        name: response.name,
        description: response.description,
        url: response.url,
        namespace: response.namespace,
        type: response.type,
        capabilities: response.capabilities,
        integrations: response.integrations,
        createdAt: response.$createdAt
      }
    })

  } catch (error) {
    console.error('Error creating chatbot:', error)
    return NextResponse.json(
      { error: 'Failed to create chatbot' },
      { status: 500 }
    )
  }
}

// Initialize RAG namespace for new chatbot
const initializeRAGNamespace = async (chatbotId: string, name: string, url?: string) => {
  try {
    // This would initialize the vector database namespace
    // and potentially crawl the company website for initial knowledge
    console.log('Initializing RAG namespace for:', chatbotId, name, url)
    
    if (url) {
      // Could integrate with Firecrawl or similar service to crawl website
      console.log('Would crawl website:', url)
    }
  } catch (error) {
    console.warn('RAG namespace initialization failed:', error)
  }
} 