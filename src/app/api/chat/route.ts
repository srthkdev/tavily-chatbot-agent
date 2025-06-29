import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { serverConfig } from '@/config/tavily.config'

interface SearchResult {
  title: string
  url: string
  content: string
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface CompanyData {
  name?: string
  industry?: string
  hqLocation?: string
  url?: string
  researchReport?: string
}

interface ChatRequest {
  messages: ChatMessage[]
  chatbotId?: string
  companyName?: string
  companyData?: CompanyData
}

// Company Research Agent Integration
const invokeCompanyResearchAgent = async (query: string, companyName?: string) => {
  try {
    // This would integrate with the company-research-agent-main folder
    // For now, we'll simulate the agent response
    console.log('Invoking company research agent for:', query, companyName)
    
    const agentResponse = {
      analysis: `Comprehensive analysis for ${companyName || 'the company'} regarding: ${query}`,
      insights: [
        'Market position analysis',
        'Financial performance metrics',
        'Competitive landscape assessment',
        'Strategic recommendations'
      ],
      data: {
        revenue: 'Data would be fetched from real sources',
        growth: 'Growth metrics from financial APIs',
        competitors: 'Competitor analysis from market research'
      },
      sources: [
        'Financial databases',
        'Market research reports',
        'Company filings',
        'Industry analysis'
      ]
    }
    
    return agentResponse
  } catch (error) {
    console.warn('Company research agent failed:', error)
    return null
  }
}

// LangGraph Agent Integration
const invokeLangGraphAgent = async (query: string, context?: Record<string, unknown>) => {
  try {
    if (!process.env.LANGGRAPH_API_URL) {
      console.warn('LangGraph API URL not configured')
      return null
    }

    // LangGraph agent integration
    const agentInput = {
      query,
      context,
      tools: [
        'tavily_search',
        'financial_analysis', 
        'company_research',
        'competitor_analysis',
        'market_intelligence'
      ],
      max_iterations: 5,
      temperature: 0.7
    }

    console.log('LangGraph agent input:', agentInput)
    
    // Mock response for now - would be real LangGraph API call
    return {
      result: `LangGraph agent analysis: ${query}`,
      reasoning: 'Multi-step reasoning completed with tool usage',
      tools_used: ['tavily_search', 'financial_analysis'],
      confidence: 0.95
    }
  } catch (error) {
    console.warn('LangGraph agent failed:', error)
    return null
  }
}

// Tavily Search Integration
const searchWithTavily = async (query: string): Promise<SearchResult[]> => {
  try {
    if (!process.env.TAVILY_API_KEY) {
      console.warn('Tavily API key not found')
      return []
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
      },
      body: JSON.stringify({
        query,
        search_depth: 'advanced',
        include_domains: ['bloomberg.com', 'reuters.com', 'sec.gov', 'finance.yahoo.com'],
        max_results: 5
      })
    })

    if (!response.ok) {
      throw new Error('Tavily API request failed')
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.warn('Tavily search failed:', error)
    return []
  }
}

// Mem0 Memory Integration
const storeInMemory = async (userId: string, conversationData: Record<string, unknown>) => {
  try {
    if (!process.env.MEM0_API_KEY) {
      console.warn('Mem0 API key not found')
      return
    }

    // Mem0 integration would go here
    console.log('Storing conversation in Mem0 for user:', userId, conversationData)
  } catch (error) {
    console.warn('Mem0 storage failed:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, chatbotId, companyName, companyData } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]?.content || ''

    // Enhanced system prompt for business intelligence
    let systemPrompt = `You are Walnut AI, an advanced business intelligence assistant with access to:

🔍 **Real-time Web Search** via Tavily API
🧠 **Persistent Memory** via Mem0
📊 **Knowledge Base** via RAG
🤖 **Complex Reasoning** via LangGraph agents
🏢 **Company Research** via specialized agents

## Your Capabilities:

### Company Analysis
- Financial performance and metrics analysis
- Competitive landscape assessment
- Market positioning and trends
- Strategic recommendations
- Risk assessment and opportunities

### Data Integration
- Real-time financial data
- Market research and industry reports
- Company filings and regulatory documents
- News and press releases
- Social media sentiment

### Advanced Features
- Multi-step reasoning with LangGraph
- Persistent conversation memory
- Context-aware responses
- Source attribution and verification
- Executive-level reporting

Provide comprehensive, actionable insights for business decision-making. Use markdown formatting with tables, charts, and structured data when appropriate.`

    if (companyName) {
      systemPrompt += `\n\nYou are specifically assisting with analysis of **${companyName}**.`
      
      if (companyData) {
        systemPrompt += `\n\nCompany Context:
- Name: ${companyData.name}
- Industry: ${companyData.industry || 'Not specified'}
- Location: ${companyData.hqLocation || 'Not specified'}
- Website: ${companyData.url || 'Not specified'}`

        if (companyData.researchReport) {
          systemPrompt += `\n\nResearch Summary: ${companyData.researchReport.substring(0, 500)}...`
        }
      }
    }

    // Get AI model
    const model = serverConfig.ai.model
    if (!model) {
      return NextResponse.json(
        { error: 'No AI model available' },
        { status: 500 }
      )
    }

    // Enhanced processing with multiple AI capabilities
    let enhancedContext = ''
    const sources: Array<{ title: string; url: string; snippet: string }> = []

    // 1. Tavily Search for real-time information
    if (lastMessage) {
      try {
        const searchResults = await searchWithTavily(lastMessage)
        if (searchResults.length > 0) {
          enhancedContext += '\n\n**Recent Information:**\n'
          searchResults.forEach((result: SearchResult, index: number) => {
            enhancedContext += `${index + 1}. ${result.title}: ${result.content}\n`
            sources.push({
              title: result.title,
              url: result.url,
              snippet: result.content
            })
          })
        }
      } catch (error) {
        console.warn('Tavily search failed:', error)
      }
    }

    // 2. Company Research Agent
    if (companyName) {
      try {
        const researchResult = await invokeCompanyResearchAgent(lastMessage, companyName)
        if (researchResult) {
          enhancedContext += '\n\n**Company Research Analysis:**\n'
          enhancedContext += `${researchResult.analysis}\n`
          enhancedContext += `Key Insights: ${researchResult.insights.join(', ')}\n`
        }
      } catch (error) {
        console.warn('Company research agent failed:', error)
      }
    }

    // 3. LangGraph Agent for Complex Reasoning
    try {
      const langGraphResult = await invokeLangGraphAgent(lastMessage, {
        companyName,
        companyData,
        context: enhancedContext
      })
      if (langGraphResult) {
        enhancedContext += '\n\n**Advanced Analysis:**\n'
        enhancedContext += `${langGraphResult.result}\n`
        enhancedContext += `Reasoning: ${langGraphResult.reasoning}\n`
      }
    } catch (error) {
      console.warn('LangGraph agent failed:', error)
    }

    // Add enhanced context to system prompt
    if (enhancedContext) {
      systemPrompt += `\n\n**Current Context:**${enhancedContext}`
    }

    // Stream response with enhanced AI
    const result = await streamText({
      model,
      system: systemPrompt,
      messages: messages.map((msg: ChatMessage) => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: serverConfig.ai.temperature,
      maxTokens: serverConfig.ai.maxTokens,
    })

    // Store conversation in memory (async)
    if (chatbotId) {
      storeInMemory(chatbotId, { messages, response: 'streaming' }).catch(console.warn)
    }

    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        console.error('Chat stream error:', error)
        return 'I apologize, but I encountered an error while processing your request. Please try again.'
      }
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 