import { BaseMessage, SystemMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { searchWeb, TavilySearchResult } from './tavily'
import { addConversationTurn, getMemoryContext } from './mem0'
import { searchDocuments } from './upstash-search'
import { serverConfig } from '@/config/tavily.config'

// State interface for the agent
interface AgentState {
  messages: BaseMessage[]
  query: string
  userId?: string
  chatbotId?: string
  namespace?: string
  companyInfo?: CompanyInfo
  searchResults?: TavilySearchResult[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ragResults?: any[]
  memoryContext?: string
  finalResponse?: string
  sources?: Source[]
  isCompanySpecific: boolean
  queryIntent?: QueryIntent
}

interface CompanyInfo {
  name: string
  domain: string
  description: string
  industry?: string
  products?: string[]
  services?: string[]
}

interface Source {
  id: string
  title: string
  url: string
  snippet: string
  type: 'web' | 'memory' | 'rag' | 'linkedin' | 'company' | 'reddit' | 'twitter' | 'github' | 'news' | 'youtube' | 'blog' | 'review' | 'social' | 'forum' | 'wiki' | 'crunchbase' | 'glassdoor'
  score?: number
  metadata?: {
    domain?: string
    publishedDate?: string
    author?: string
    company?: string
    position?: string
    platform?: string
    subreddit?: string
    username?: string
    votes?: number
    comments?: number
    rating?: number
  }
}

interface QueryIntent {
  type: 'general' | 'people' | 'reviews' | 'technical' | 'news' | 'culture' | 'products' | 'competition'
  keywords: string[]
  platforms: string[]
}

// Initialize AI models based on configuration
function getAIModel() {
  const openaiKey = process.env.OPENAI_API_KEY
  const geminiKey = process.env.GOOGLE_API_KEY
  const groqKey = process.env.GROQ_API_KEY

  // Priority: OpenAI > Gemini > Groq
  if (openaiKey) {
    return new ChatOpenAI({
      apiKey: openaiKey,
      model: 'gpt-4.1',
      temperature: serverConfig.ai.temperature,
      maxTokens: serverConfig.ai.maxTokens,
    })
  }

  if (geminiKey) {
    return new ChatGoogleGenerativeAI({
      apiKey: geminiKey,
      model: 'gemini-2.0-flash-exp',
      temperature: serverConfig.ai.temperature,
    })
  }

  // For Groq, we'll use OpenAI-compatible endpoint
  if (groqKey) {
    return new ChatOpenAI({
      apiKey: groqKey,
      model: 'llama-3.3-70b-versatile',
      temperature: serverConfig.ai.temperature,
      maxTokens: serverConfig.ai.maxTokens,
      configuration: {
        baseURL: 'https://api.groq.com/openai/v1',
      },
    })
  }

  throw new Error('No AI provider configured')
}

// Analyze query intent to determine what platforms to search
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function analyzeQueryIntent(query: string, companyName?: string): QueryIntent {
  const queryLower = query.toLowerCase()
  
  // People-related queries
  if (queryLower.includes('who') || queryLower.includes('founder') || queryLower.includes('ceo') || 
      queryLower.includes('team') || queryLower.includes('employee') || queryLower.includes('staff') ||
      queryLower.includes('leadership') || queryLower.includes('executive') || queryLower.includes('key people')) {
    return {
      type: 'people',
      keywords: ['founder', 'ceo', 'leadership', 'team', 'executive'],
      platforms: ['linkedin', 'crunchbase', 'company']
    }
  }
  
  // Review-related queries
  if (queryLower.includes('review') || queryLower.includes('rating') || queryLower.includes('opinion') ||
      queryLower.includes('experience') || queryLower.includes('feedback') || queryLower.includes('testimonial')) {
    return {
      type: 'reviews',
      keywords: ['review', 'rating', 'experience', 'feedback'],
      platforms: ['glassdoor', 'trustpilot', 'reddit', 'twitter']
    }
  }
  
  // Technical queries
  if (queryLower.includes('tech') || queryLower.includes('technology') || queryLower.includes('stack') ||
      queryLower.includes('github') || queryLower.includes('code') || queryLower.includes('api') ||
      queryLower.includes('open source') || queryLower.includes('repository')) {
    return {
      type: 'technical',
      keywords: ['technology', 'tech stack', 'github', 'api', 'code'],
      platforms: ['github', 'stackoverflow', 'hackernews', 'reddit']
    }
  }
  
  // News and updates
  if (queryLower.includes('news') || queryLower.includes('announcement') || queryLower.includes('update') ||
      queryLower.includes('recent') || queryLower.includes('latest') || queryLower.includes('new')) {
    return {
      type: 'news',
      keywords: ['news', 'announcement', 'update', 'latest'],
      platforms: ['news', 'twitter', 'blog', 'company']
    }
  }
  
  // Culture and workplace
  if (queryLower.includes('culture') || queryLower.includes('work') || queryLower.includes('office') ||
      queryLower.includes('benefits') || queryLower.includes('salary') || queryLower.includes('interview')) {
    return {
      type: 'culture',
      keywords: ['culture', 'workplace', 'benefits', 'salary'],
      platforms: ['glassdoor', 'reddit', 'linkedin', 'blind']
    }
  }
  
  // Products and services
  if (queryLower.includes('product') || queryLower.includes('service') || queryLower.includes('feature') ||
      queryLower.includes('pricing') || queryLower.includes('plan') || queryLower.includes('offering')) {
    return {
      type: 'products',
      keywords: ['product', 'service', 'feature', 'pricing'],
      platforms: ['company', 'reddit', 'youtube', 'blog']
    }
  }
  
  // Competition and market
  if (queryLower.includes('competitor') || queryLower.includes('vs') || queryLower.includes('compare') ||
      queryLower.includes('alternative') || queryLower.includes('market') || queryLower.includes('industry')) {
    return {
      type: 'competition',
      keywords: ['competitor', 'alternative', 'market', 'industry'],
      platforms: ['crunchbase', 'reddit', 'news', 'blog']
    }
  }
  
  // Default general query
  return {
    type: 'general',
    keywords: [],
    platforms: ['company', 'news', 'reddit']
  }
}

// Enhanced search function that targets specific platforms
async function performEnhancedWebSearch(
  query: string, 
  companyInfo?: CompanyInfo,
  intent?: QueryIntent
): Promise<{ results: TavilySearchResult[], sources: Source[] }> {
  const searches: Promise<TavilySearchResult[]>[] = []
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const allSources: Source[] = []
  
  try {
    // Base company search
    if (companyInfo) {
      const companyQuery = `${query} ${companyInfo.name} site:${companyInfo.domain}`
      searches.push(searchWeb({
        query: companyQuery,
        maxResults: 3,
        searchDepth: 'advanced',
        includeRawContent: true,
        includeDomains: [companyInfo.domain],
      }).then(r => r.results))
    }
    
    // Intent-based searches
    if (intent && companyInfo) {
      switch (intent.type) {
        case 'people':
          // LinkedIn search for executives
          searches.push(searchWeb({
            query: `${companyInfo.name} CEO founder executive site:linkedin.com`,
            maxResults: 3,
            searchDepth: 'basic',
          }).then(r => r.results))
          
          // Crunchbase for company info
          searches.push(searchWeb({
            query: `${companyInfo.name} founders team site:crunchbase.com`,
            maxResults: 2,
            searchDepth: 'basic',
          }).then(r => r.results))
          break
          
        case 'reviews':
          // Glassdoor reviews
          searches.push(searchWeb({
            query: `${companyInfo.name} reviews site:glassdoor.com`,
            maxResults: 2,
            searchDepth: 'basic',
          }).then(r => r.results))
          
          // Reddit discussions
          searches.push(searchWeb({
            query: `${companyInfo.name} experience review site:reddit.com`,
            maxResults: 3,
            searchDepth: 'basic',
          }).then(r => r.results))
          break
          
        case 'technical':
          // GitHub repositories
          searches.push(searchWeb({
            query: `${companyInfo.name} repository code site:github.com`,
            maxResults: 2,
            searchDepth: 'basic',
          }).then(r => r.results))
          
          // Stack Overflow discussions
          searches.push(searchWeb({
            query: `${companyInfo.name} API technology site:stackoverflow.com`,
            maxResults: 2,
            searchDepth: 'basic',
          }).then(r => r.results))
          break
          
        case 'news':
          // Recent news
          searches.push(searchWeb({
            query: `${companyInfo.name} news announcement update`,
            maxResults: 4,
            searchDepth: 'basic',
            topic: 'news',
          }).then(r => r.results))
          break
          
        case 'culture':
          // Glassdoor culture info
          searches.push(searchWeb({
            query: `${companyInfo.name} culture workplace benefits site:glassdoor.com`,
            maxResults: 2,
            searchDepth: 'basic',
          }).then(r => r.results))
          break
          
        default:
          // General web search
          searches.push(searchWeb({
            query: `${query} ${companyInfo.name}`,
            maxResults: 4,
            searchDepth: 'advanced',
          }).then(r => r.results))
      }
    }
    
    // Execute all searches in parallel
    const searchResults = await Promise.all(searches)
    const flatResults = searchResults.flat()
    
    // Convert to enhanced sources with platform detection
    const enhancedSources: Source[] = flatResults.map((result, index) => {
      const url = result.url
      const domain = new URL(url).hostname.toLowerCase()
      
      let type: Source['type'] = 'web'
      const metadata: Source['metadata'] = { domain }
      
      // Detect platform and extract metadata
      if (domain.includes('linkedin.com')) {
        type = 'linkedin'
        // Try to extract name and position from LinkedIn URLs/titles
        const nameMatch = result.title.match(/^([^-|]+)/)
        const positionMatch = result.title.match(/[-|]\s*(.+?)\s*[-|]/)
        if (nameMatch) metadata.author = nameMatch[1].trim()
        if (positionMatch) metadata.position = positionMatch[1].trim()
        if (companyInfo) metadata.company = companyInfo.name
      } else if (domain.includes('reddit.com')) {
        type = 'reddit'
        const subredditMatch = url.match(/reddit\.com\/r\/([^\/]+)/)
        if (subredditMatch) metadata.subreddit = subredditMatch[1]
      } else if (domain.includes('github.com')) {
        type = 'github'
        const repoMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/)
        if (repoMatch) metadata.author = repoMatch[1]
      } else if (domain.includes('glassdoor.com')) {
        type = 'glassdoor'
        if (companyInfo) metadata.company = companyInfo.name
      } else if (domain.includes('crunchbase.com')) {
        type = 'crunchbase'
        if (companyInfo) metadata.company = companyInfo.name
      } else if (domain.includes('news') || domain.includes('techcrunch') || domain.includes('forbes')) {
        type = 'news'
      } else if (domain.includes('blog') || domain.includes('medium.com')) {
        type = 'blog'
      } else if (companyInfo && domain.includes(companyInfo.domain)) {
        type = 'company'
        metadata.company = companyInfo.name
      }
      
      return {
        id: `enhanced-${index}`,
        title: result.title,
        url: result.url,
        snippet: result.content.substring(0, 200),
        type,
        score: result.score,
        metadata,
      }
    })
    
    return {
      results: flatResults,
      sources: enhancedSources,
    }
  } catch (error) {
    console.warn('Enhanced web search failed:', error)
    return { results: [], sources: [] }
  }
}

// Agent class that handles the workflow
class TavilyAgent {
  private model: ChatOpenAI | ChatGoogleGenerativeAI

  constructor() {
    this.model = getAIModel()
  }

  // Determine if this is a company-specific query
  private analyzeQuery(state: AgentState): AgentState {
    const { query, namespace, chatbotId, companyInfo: existingCompanyInfo } = state
    
    // If we have a namespace, chatbotId, or existing company info, this is company-specific
    const isCompanySpecific = !!(namespace || chatbotId || existingCompanyInfo)
    
    let companyInfo: CompanyInfo | undefined = existingCompanyInfo
    let queryIntent: QueryIntent | undefined
    
    if (isCompanySpecific && !companyInfo && namespace) {
      // Extract company info from namespace
      const domain = namespace.split('-')[0].replace(/-/g, '.')
      const name = domain.split('.')[0]
      companyInfo = {
        name,
        domain,
        description: `AI assistant for ${name}`,
      }
    }
    
    if (companyInfo) {
      // Analyze query intent for better search targeting
      queryIntent = analyzeQueryIntent(query, companyInfo.name)
    }

    return {
      ...state,
      isCompanySpecific,
      companyInfo,
      queryIntent,
    }
  }

  // Retrieve relevant memories
  private async retrieveMemories(state: AgentState): Promise<AgentState> {
    const { query, userId, chatbotId } = state
    
    let memoryContext = ''
    
    if (userId) {
      try {
        memoryContext = await getMemoryContext(query, {
          user_id: userId,
          agent_id: chatbotId,
        })
      } catch (error) {
        console.warn('Failed to retrieve memories:', error)
      }
    }

    return {
      ...state,
      memoryContext,
    }
  }

  // Perform RAG search on company-specific content
  private async performRAGSearch(state: AgentState): Promise<AgentState> {
    const { query, namespace, isCompanySpecific } = state
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ragResults: any[] = []
    
    if (isCompanySpecific && namespace) {
      try {
        ragResults = await searchDocuments(query, namespace, 10)
      } catch (error) {
        console.warn('RAG search failed:', error)
      }
    }

    return {
      ...state,
      ragResults,
    }
  }

  // Perform enhanced web search with platform targeting
  private async performWebSearch(state: AgentState): Promise<AgentState> {
    const { query, isCompanySpecific, companyInfo, queryIntent } = state
    
    let searchResults: TavilySearchResult[] = []
    let enhancedSources: Source[] = []
    
    if (isCompanySpecific && companyInfo) {
      // Use enhanced search for company-specific queries
      const searchResponse = await performEnhancedWebSearch(query, companyInfo, queryIntent)
      searchResults = searchResponse.results
      enhancedSources = searchResponse.sources
    } else {
      // Regular search for general queries
      try {
        const searchResponse = await searchWeb({
          query,
          maxResults: 8,
          searchDepth: 'advanced',
          includeRawContent: true,
          includeAnswer: false,
        })
        
        searchResults = searchResponse.results
        enhancedSources = searchResults.map((result, index) => ({
          id: `web-${index}`,
          title: result.title,
          url: result.url,
          snippet: result.content.substring(0, 200),
          type: 'web' as const,
          score: result.score,
          metadata: {
            domain: new URL(result.url).hostname,
          },
        }))
      } catch (error) {
        console.warn('Web search failed:', error)
      }
    }

    return {
      ...state,
      searchResults,
      sources: enhancedSources,
    }
  }

  // Synthesize information and generate response
  private async generateResponse(state: AgentState): Promise<AgentState> {
    const {
      messages,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      query,
      isCompanySpecific,
      companyInfo,
      searchResults = [],
      ragResults = [],
      memoryContext,
      sources = [],
    } = state

    // Prepare context from all sources
    let context = ''
    
    if (ragResults.length > 0) {
      context += '\n\nCompany-specific information:\n'
      ragResults.forEach((result, index) => {
        context += `[${index + 1}] ${result.title || 'Company Document'}\n${result.content?.substring(0, 500) || ''}...\n\n`
      })
    }
    
    if (searchResults.length > 0) {
      context += '\n\nWeb search results:\n'
      searchResults.forEach((result, index) => {
        const adjustedIndex = ragResults.length + index + 1
        context += `[${adjustedIndex}] ${result.title}\nURL: ${result.url}\n${result.content.substring(0, 500)}...\n\n`
      })
    }

    // Prepare system message
    let systemPrompt = serverConfig.ai.systemPrompt
    
    if (isCompanySpecific && companyInfo) {
      systemPrompt = `You are an AI assistant representing ${companyInfo.name} (${companyInfo.domain}). 

${serverConfig.ai.systemPrompt}

Company Information:
- Name: ${companyInfo.name}
- Domain: ${companyInfo.domain}
- Description: ${companyInfo.description}

When responding:
- Use "we", "our", and "us" when referring to ${companyInfo.name}
- Provide information about our products, services, and company
- Always cite sources using [1], [2], etc. when referencing specific information
- If you don't have specific information, suggest contacting us directly
- Maintain a professional and helpful tone that represents our brand`
    }

    // Add memory context if available
    if (memoryContext) {
      systemPrompt = `Previous conversation context:\n${memoryContext}\n\n${systemPrompt}`
    }

    // Add context if available
    if (context) {
      systemPrompt += `\n\nAvailable information:${context}`
    }

    // Prepare messages for the model
    const modelMessages = [
      new SystemMessage(systemPrompt),
      ...messages,
    ]

    // Generate response
    const response = await this.model.invoke(modelMessages)
    const finalResponse = response.content as string

    return {
      ...state,
      finalResponse,
      sources,
    }
  }

  // Save conversation to memory
  private async saveToMemory(state: AgentState): Promise<AgentState> {
    const { query, finalResponse, userId, chatbotId } = state
    
    if (userId && finalResponse) {
      try {
        await addConversationTurn(query, finalResponse, {
          user_id: userId,
          agent_id: chatbotId,
        })
      } catch (error) {
        console.warn('Failed to save to memory:', error)
      }
    }

    return state
  }

  // Main workflow execution
  async processQuery(initialState: AgentState): Promise<AgentState> {
    let state = initialState

    // Step 1: Analyze query
    state = this.analyzeQuery(state)

    // Step 2: Retrieve memories
    state = await this.retrieveMemories(state)

    // Step 3: Perform RAG search
    state = await this.performRAGSearch(state)

    // Step 4: Perform enhanced web search
    state = await this.performWebSearch(state)

    // Step 5: Generate response
    state = await this.generateResponse(state)

    // Step 6: Save to memory
    state = await this.saveToMemory(state)

    return state
  }

  // Streaming workflow execution
  async processQueryStream(
    initialState: AgentState,
    onUpdate: (update: {
      type: 'status' | 'sources' | 'content' | 'complete'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: any
    }) => void
  ): Promise<void> {
    let state = initialState

    try {
      // Step 1: Analyze query
      onUpdate({ type: 'status', data: 'Analyzing query...' })
      state = this.analyzeQuery(state)
      
      if (state.isCompanySpecific) {
        const intentMsg = state.queryIntent?.type === 'people' ? 'Searching for key people...' :
                         state.queryIntent?.type === 'reviews' ? 'Looking for reviews and feedback...' :
                         state.queryIntent?.type === 'technical' ? 'Finding technical information...' :
                         `Acting as ${state.companyInfo?.name} representative...`
        onUpdate({ type: 'status', data: intentMsg })
      } else {
        onUpdate({ type: 'status', data: 'Processing general query...' })
      }

      // Step 2: Retrieve memories
      state = await this.retrieveMemories(state)
      if (state.memoryContext) {
        onUpdate({ type: 'status', data: 'Retrieved conversation history...' })
      }

      // Step 3: Perform RAG search
      state = await this.performRAGSearch(state)
      if (state.ragResults && state.ragResults.length > 0) {
        onUpdate({ type: 'status', data: `Found ${state.ragResults.length} company documents...` })
      }

      // Step 4: Perform enhanced web search
      onUpdate({ type: 'status', data: 'Searching across multiple platforms...' })
      state = await this.performWebSearch(state)
      if (state.sources && state.sources.length > 0) {
        onUpdate({ type: 'sources', data: state.sources })
        onUpdate({ type: 'status', data: 'Generating comprehensive response...' })
      }

      // Step 5: Generate response
      state = await this.generateResponse(state)
      if (state.finalResponse) {
        onUpdate({ type: 'content', data: state.finalResponse })
      }

      // Step 6: Save to memory
      state = await this.saveToMemory(state)

      // Complete
      onUpdate({ 
        type: 'complete', 
        data: {
          response: state.finalResponse,
          sources: state.sources,
          isCompanySpecific: state.isCompanySpecific,
        }
      })
    } catch (error) {
      console.error('Agent workflow error:', error)
      onUpdate({ 
        type: 'complete', 
        data: {
          response: 'I apologize, but I encountered an error while processing your request.',
          sources: [],
          isCompanySpecific: false,
        }
      })
    }
  }
}

// Main function to process a query through the agent
export async function processQuery({
  messages,
  query,
  userId,
  chatbotId,
  namespace,
  companyInfo,
}: {
  messages: BaseMessage[]
  query: string
  userId?: string
  chatbotId?: string
  namespace?: string
  companyInfo?: CompanyInfo
}): Promise<{
  response: string
  sources: Source[]
  isCompanySpecific: boolean
}> {
  const agent = new TavilyAgent()
  
  const initialState: AgentState = {
    messages,
    query,
    userId,
    chatbotId,
    namespace,
    companyInfo,
    isCompanySpecific: !!(namespace || chatbotId || companyInfo),
  }

  const result = await agent.processQuery(initialState)
  
  return {
    response: result.finalResponse || 'I apologize, but I was unable to generate a response.',
    sources: result.sources || [],
    isCompanySpecific: result.isCompanySpecific,
  }
}

// Streaming version for real-time responses
export async function processQueryStream({
  messages,
  query,
  userId,
  chatbotId,
  namespace,
  onUpdate,
}: {
  messages: BaseMessage[]
  query: string
  userId?: string
  chatbotId?: string
  namespace?: string
  onUpdate: (update: {
    type: 'status' | 'sources' | 'content' | 'complete'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any
  }) => void
}): Promise<void> {
  const agent = new TavilyAgent()
  
  const initialState: AgentState = {
    messages,
    query,
    userId,
    chatbotId,
    namespace,
    isCompanySpecific: false,
  }

  await agent.processQueryStream(initialState, onUpdate)
}

export type { AgentState, CompanyInfo, Source } 