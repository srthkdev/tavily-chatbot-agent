import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { searchWeb, TavilySearchResult } from './tavily'
import { searchMemories, addConversationTurn, getMemoryContext } from './mem0'
import { searchDocuments } from './upstash-search'
import { serverConfig } from '@/config/tavily.config'

// Company Research State Interface
interface CompanyResearchState {
  company: string
  companyUrl?: string
  industry?: string
  hqLocation?: string
  userId?: string
  chatbotId?: string
  namespace?: string
  
  // Research data
  siteData?: any
  financialData?: any
  newsData?: any
  industryData?: any
  companyData?: any
  
  // Processed data
  curatedFinancialData?: any
  curatedNewsData?: any
  curatedIndustryData?: any
  curatedCompanyData?: any
  
  // Briefings
  financialBriefing?: string
  newsBriefing?: string
  industryBriefing?: string
  companyBriefing?: string
  
  // Final outputs
  briefings?: any
  report?: string
  references?: string[]
  sources?: any[]
  
  // Chat state
  messages: BaseMessage[]
  memoryContext?: string
  searchResults?: TavilySearchResult[]
  ragResults?: any[]
  isCompanyChat: boolean
  
  // Progress tracking
  currentStep?: string
  progress?: number
}

interface CompanyInfo {
  name: string
  domain: string
  description: string
  industry?: string
  hqLocation?: string
  products?: string[]
  services?: string[]
  keyPeople?: string[]
  founded?: string
  employees?: string
}

// Initialize AI model
function getAIModel() {
  const openaiKey = process.env.OPENAI_API_KEY
  const geminiKey = process.env.GOOGLE_API_KEY
  const groqKey = process.env.GROQ_API_KEY

  if (openaiKey) {
    return new ChatOpenAI({
      apiKey: openaiKey,
      model: 'gpt-4o-mini',
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

// Company Research Agent Class
export class CompanyResearchAgent {
  private model: ChatOpenAI | ChatGoogleGenerativeAI

  constructor() {
    this.model = getAIModel()
  }

  // Step 1: Ground the research with basic company information
  async groundingStep(state: CompanyResearchState): Promise<CompanyResearchState> {
    const { company, companyUrl } = state
    
    try {
      // Search for basic company information
      const searchQuery = `${company} company information ${companyUrl ? `site:${companyUrl}` : ''}`
      const searchResponse = await searchWeb({
        query: searchQuery,
        maxResults: 5,
        searchDepth: 'advanced',
        includeRawContent: true,
      })

      // Extract basic company info
      const siteData = {
        url: companyUrl,
        searchResults: searchResponse.results,
        extractedInfo: await this.extractCompanyInfo(searchResponse.results, company)
      }

      return {
        ...state,
        siteData,
        currentStep: 'grounding',
        progress: 10,
      }
    } catch (error) {
      console.error('Grounding step failed:', error)
      return {
        ...state,
        currentStep: 'grounding_failed',
        progress: 10,
      }
    }
  }

  // Step 2: Financial Analysis
  async financialAnalysisStep(state: CompanyResearchState): Promise<CompanyResearchState> {
    const { company, siteData } = state
    
    try {
      const financialQuery = `${company} financial data revenue funding valuation earnings stock price`
      const searchResponse = await searchWeb({
        query: financialQuery,
        maxResults: 8,
        searchDepth: 'advanced',
      })

      const financialData = {
        searchResults: searchResponse.results,
        extractedMetrics: await this.extractFinancialMetrics(searchResponse.results, company)
      }

      return {
        ...state,
        financialData,
        currentStep: 'financial_analysis',
        progress: 25,
      }
    } catch (error) {
      console.error('Financial analysis failed:', error)
      return {
        ...state,
        currentStep: 'financial_analysis_failed',
        progress: 25,
      }
    }
  }

  // Step 3: News Analysis
  async newsAnalysisStep(state: CompanyResearchState): Promise<CompanyResearchState> {
    const { company } = state
    
    try {
      const newsQuery = `${company} news updates announcements recent developments`
      const searchResponse = await searchWeb({
        query: newsQuery,
        maxResults: 10,
        searchDepth: 'basic',
      })

      const newsData = {
        searchResults: searchResponse.results,
        recentNews: await this.extractNewsHighlights(searchResponse.results, company)
      }

      return {
        ...state,
        newsData,
        currentStep: 'news_analysis',
        progress: 40,
      }
    } catch (error) {
      console.error('News analysis failed:', error)
      return {
        ...state,
        currentStep: 'news_analysis_failed',
        progress: 40,
      }
    }
  }

  // Step 4: Industry Analysis
  async industryAnalysisStep(state: CompanyResearchState): Promise<CompanyResearchState> {
    const { company, industry, siteData } = state
    
    try {
      const detectedIndustry = industry || siteData?.extractedInfo?.industry || 'technology'
      const industryQuery = `${detectedIndustry} industry analysis market trends competitors ${company}`
      
      const searchResponse = await searchWeb({
        query: industryQuery,
        maxResults: 6,
        searchDepth: 'advanced',
      })

      const industryData = {
        industry: detectedIndustry,
        searchResults: searchResponse.results,
        marketAnalysis: await this.extractIndustryInsights(searchResponse.results, company, detectedIndustry)
      }

      return {
        ...state,
        industryData,
        currentStep: 'industry_analysis',
        progress: 55,
      }
    } catch (error) {
      console.error('Industry analysis failed:', error)
      return {
        ...state,
        currentStep: 'industry_analysis_failed',
        progress: 55,
      }
    }
  }

  // Step 5: Company Deep Dive
  async companyAnalysisStep(state: CompanyResearchState): Promise<CompanyResearchState> {
    const { company, companyUrl } = state
    
    try {
      const companyQuery = `${company} products services leadership team culture mission values`
      const searchResponse = await searchWeb({
        query: companyQuery,
        maxResults: 8,
        searchDepth: 'advanced',
        includeDomains: companyUrl ? [new URL(companyUrl).hostname] : undefined,
      })

      const companyData = {
        searchResults: searchResponse.results,
        companyProfile: await this.extractCompanyProfile(searchResponse.results, company)
      }

      return {
        ...state,
        companyData,
        currentStep: 'company_analysis',
        progress: 70,
      }
    } catch (error) {
      console.error('Company analysis failed:', error)
      return {
        ...state,
        currentStep: 'company_analysis_failed',
        progress: 70,
      }
    }
  }

  // Step 6: Generate Research Report
  async generateReportStep(state: CompanyResearchState): Promise<CompanyResearchState> {
    const { company, financialData, newsData, industryData, companyData, siteData } = state
    
    try {
      const reportPrompt = `
Generate a comprehensive company research report for ${company}.

Company Information:
${JSON.stringify(siteData?.extractedInfo || {}, null, 2)}

Financial Data:
${JSON.stringify(financialData?.extractedMetrics || {}, null, 2)}

Recent News:
${JSON.stringify(newsData?.recentNews || {}, null, 2)}

Industry Analysis:
${JSON.stringify(industryData?.marketAnalysis || {}, null, 2)}

Company Profile:
${JSON.stringify(companyData?.companyProfile || {}, null, 2)}

Create a detailed markdown report with the following sections:
1. Executive Summary
2. Company Overview
3. Financial Highlights
4. Recent Developments
5. Industry Position
6. Key Strengths & Opportunities
7. Risks & Challenges
8. Conclusion

Make it professional, well-structured, and actionable.
`

      const response = await this.model.invoke([
        new SystemMessage('You are an expert business analyst creating comprehensive company research reports.'),
        new HumanMessage(reportPrompt)
      ])

      const report = response.content as string

      // Extract references from all search results
      const references: string[] = []
      ;[financialData, newsData, industryData, companyData].forEach(data => {
        if (data?.searchResults) {
          data.searchResults.forEach((result: TavilySearchResult) => {
            references.push(result.url)
          })
        }
      })

      return {
        ...state,
        report,
        references: [...new Set(references)], // Remove duplicates
        currentStep: 'report_generated',
        progress: 100,
      }
    } catch (error) {
      console.error('Report generation failed:', error)
      return {
        ...state,
        currentStep: 'report_generation_failed',
        progress: 85,
      }
    }
  }

  // Chat Mode: Handle company-specific conversations with enhanced search and RAG
  async companyChatStep(state: CompanyResearchState): Promise<CompanyResearchState> {
    const { messages, company, companyUrl, userId, chatbotId, memoryContext } = state
    
    try {
      const lastMessage = messages[messages.length - 1]
      if (!lastMessage || lastMessage.constructor !== HumanMessage) {
        throw new Error('No user message found')
      }

      const userQuery = (lastMessage as HumanMessage).content as string

      // Multi-source information gathering
      const searchPromises = []

      // 1. Company website search
      if (companyUrl) {
        const domain = new URL(companyUrl).hostname
        searchPromises.push(
          searchWeb({
            query: `${userQuery} site:${domain}`,
            maxResults: 3,
            searchDepth: 'advanced',
            includeRawContent: true,
          }).catch(e => ({ results: [] }))
        )
      }

      // 2. General company search
      searchPromises.push(
        searchWeb({
          query: `${userQuery} ${company}`,
          maxResults: 4,
          searchDepth: 'advanced',
        }).catch(e => ({ results: [] }))
      )

      // 3. RAG search if namespace available
      let ragResults: any[] = []
      if (state.namespace) {
        try {
          ragResults = await searchDocuments(userQuery, state.namespace, 5)
        } catch (error) {
          console.warn('RAG search failed:', error)
        }
      }

      // Execute searches in parallel
      const searchResults = await Promise.all(searchPromises)
      const allResults = searchResults.flatMap(r => r.results || [])

      // Get memory context if available
      let contextualMemory = memoryContext
      if (userId && !contextualMemory) {
        try {
          contextualMemory = await getMemoryContext(userQuery, {
            user_id: userId,
            agent_id: chatbotId,
          })
        } catch (error) {
          console.warn('Failed to get memory context:', error)
        }
      }

      // Prepare comprehensive context
      let contextSections = []

      // Add RAG results if available
      if (ragResults.length > 0) {
        contextSections.push(`Company Knowledge Base:
${ragResults.map(r => `- ${r.metadata?.title || 'Document'}: ${r.text ? r.text.substring(0, 300) : 'No content'}...`).join('\n')}`)
      }

      // Add search results
      if (allResults.length > 0) {
        contextSections.push(`Recent Information:
${allResults.map(r => `- ${r.title}: ${r.content ? r.content.substring(0, 250) : 'No content'}...`).join('\n')}`)
      }

      // Add memory context
      if (contextualMemory) {
        contextSections.push(`Previous Conversation Context:\n${contextualMemory}`)
      }

      // Generate enhanced company-specific response
      const chatPrompt = `
You are the official AI assistant for ${company}. You represent the company directly and should provide helpful, accurate information about ${company}.

Company: ${company}
Website: ${companyUrl || 'Not provided'}
User Question: ${userQuery}

Available Information:
${contextSections.join('\n\n')}

Instructions:
1. Act as the official representative of ${company}
2. Use "we", "our", and "us" when referring to ${company}
3. Provide specific, accurate information based on the available context
4. If the question is about ${company}, prioritize information from the company knowledge base and website
5. Be helpful, professional, and maintain the company's brand voice
6. If you don't have specific information, acknowledge this and offer to help find it
7. Include relevant details like products, services, contact information when appropriate
8. For general questions not about ${company}, still be helpful but clarify your role

Generate a comprehensive, helpful response:
`

      const response = await this.model.invoke([
        new SystemMessage(`You are the official AI assistant for ${company}. Always be helpful, accurate, and professional while representing the company.`),
        new HumanMessage(chatPrompt)
      ])

      const assistantMessage = new AIMessage(response.content as string)

      // Save conversation to memory if user is authenticated
      if (userId) {
        try {
          await addConversationTurn(userQuery, response.content as string, {
            user_id: userId,
            agent_id: chatbotId,
          })
        } catch (error) {
          console.warn('Failed to save conversation to memory:', error)
        }
      }

      // Prepare sources for the response
      const sources = [
        ...ragResults.map((r, i) => ({
          id: `rag-${i}`,
          title: r.metadata?.title || 'Company Document',
          url: r.metadata?.url || companyUrl || '#',
          snippet: r.text ? r.text.substring(0, 200) : 'No content available',
          type: 'rag' as const,
          score: r.score
        })),
        ...allResults.map((r, i) => ({
          id: `web-${i}`,
          title: r.title,
          url: r.url,
          snippet: r.content ? r.content.substring(0, 200) : 'No content available',
          type: 'web' as const,
          score: r.score
        }))
      ]

      return {
        ...state,
        messages: [...messages, assistantMessage],
        searchResults: allResults,
        ragResults,
        sources,
        currentStep: 'chat_response',
      }
    } catch (error) {
      console.error('Company chat failed:', error)
      
      // Fallback response
      const errorMessage = new AIMessage(`I apologize, but I'm having trouble accessing information right now. As the ${company} assistant, I'm here to help with any questions about our company, products, or services. Please try asking your question again.`)
      
      return {
        ...state,
        messages: [...messages, errorMessage],
        currentStep: 'chat_error',
      }
    }
  }

  // Helper method to extract company information
  private async extractCompanyInfo(searchResults: TavilySearchResult[], company: string): Promise<CompanyInfo> {
    const prompt = `
Extract key company information from these search results for ${company}:

${searchResults.map(r => `${r.title}: ${r.content.substring(0, 300)}`).join('\n\n')}

Extract and return JSON with:
- name: Company name
- domain: Website domain
- description: Brief description
- industry: Industry/sector
- founded: Founding year if available
- employees: Employee count if available
- keyPeople: Array of key executives/founders
- products: Array of main products/services

Return only valid JSON.
`

    try {
      const response = await this.model.invoke([
        new SystemMessage('You are a data extraction expert. Return only valid JSON.'),
        new HumanMessage(prompt)
      ])

      const content = response.content as string
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.warn('Failed to extract company info:', error)
    }

    // Fallback
    return {
      name: company,
      domain: '',
      description: `AI assistant for ${company}`,
    }
  }

  // Helper method to extract financial metrics
  private async extractFinancialMetrics(searchResults: TavilySearchResult[], company: string): Promise<any> {
    const prompt = `
Extract financial information from these search results for ${company}:

${searchResults.map(r => `${r.title}: ${r.content.substring(0, 300)}`).join('\n\n')}

Extract and return JSON with available financial metrics:
- revenue: Latest revenue figures
- funding: Funding rounds and amounts
- valuation: Company valuation
- stockPrice: Stock price if public
- employees: Employee count
- growth: Growth metrics
- profitability: Profit/loss information

Return only valid JSON with available data.
`

    try {
      const response = await this.model.invoke([
        new SystemMessage('You are a financial analyst. Extract only factual financial data. Return valid JSON.'),
        new HumanMessage(prompt)
      ])

      const content = response.content as string
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.warn('Failed to extract financial metrics:', error)
    }

    return {}
  }

  // Helper method to extract news highlights
  private async extractNewsHighlights(searchResults: TavilySearchResult[], company: string): Promise<any> {
    const prompt = `
Extract recent news highlights from these search results for ${company}:

${searchResults.map(r => `${r.title}: ${r.content.substring(0, 300)}`).join('\n\n')}

Extract and return JSON with:
- recentNews: Array of recent news items with title, summary, date
- keyDevelopments: Major developments or announcements
- partnerships: New partnerships or collaborations
- productLaunches: New products or services launched

Return only valid JSON.
`

    try {
      const response = await this.model.invoke([
        new SystemMessage('You are a news analyst. Extract factual news information. Return valid JSON.'),
        new HumanMessage(prompt)
      ])

      const content = response.content as string
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.warn('Failed to extract news highlights:', error)
    }

    return {}
  }

  // Helper method to extract industry insights
  private async extractIndustryInsights(searchResults: TavilySearchResult[], company: string, industry: string): Promise<any> {
    const prompt = `
Extract industry insights from these search results for ${company} in the ${industry} industry:

${searchResults.map(r => `${r.title}: ${r.content.substring(0, 300)}`).join('\n\n')}

Extract and return JSON with:
- marketSize: Industry market size
- trends: Key industry trends
- competitors: Main competitors
- challenges: Industry challenges
- opportunities: Market opportunities
- companyPosition: ${company}'s position in the industry

Return only valid JSON.
`

    try {
      const response = await this.model.invoke([
        new SystemMessage('You are an industry analyst. Extract factual market information. Return valid JSON.'),
        new HumanMessage(prompt)
      ])

      const content = response.content as string
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.warn('Failed to extract industry insights:', error)
    }

    return {}
  }

  // Helper method to extract company profile
  private async extractCompanyProfile(searchResults: TavilySearchResult[], company: string): Promise<any> {
    const prompt = `
Extract detailed company profile from these search results for ${company}:

${searchResults.map(r => `${r.title}: ${r.content.substring(0, 300)}`).join('\n\n')}

Extract and return JSON with:
- mission: Company mission statement
- values: Core values
- products: Main products/services
- leadership: Key leadership team
- culture: Company culture highlights
- locations: Office locations
- awards: Recent awards or recognition

Return only valid JSON.
`

    try {
      const response = await this.model.invoke([
        new SystemMessage('You are a company researcher. Extract factual company information. Return valid JSON.'),
        new HumanMessage(prompt)
      ])

      const content = response.content as string
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.warn('Failed to extract company profile:', error)
    }

    return {}
  }

  // Main workflow orchestrator
  async runResearchWorkflow(initialState: CompanyResearchState): Promise<CompanyResearchState> {
    let state = initialState

    // Run research workflow
    state = await this.groundingStep(state)
    state = await this.financialAnalysisStep(state)
    state = await this.newsAnalysisStep(state)
    state = await this.industryAnalysisStep(state)
    state = await this.companyAnalysisStep(state)
    state = await this.generateReportStep(state)

    return state
  }

  // Main chat handler
  async handleCompanyChat(initialState: CompanyResearchState): Promise<CompanyResearchState> {
    return await this.companyChatStep(initialState)
  }
}

// Export functions for API usage
export async function runCompanyResearch({
  company,
  companyUrl,
  industry,
  hqLocation,
  userId,
}: {
  company: string
  companyUrl?: string
  industry?: string
  hqLocation?: string
  userId?: string
}): Promise<{
  report: string
  references: string[]
  companyInfo: any
}> {
  const agent = new CompanyResearchAgent()
  
  const initialState: CompanyResearchState = {
    company,
    companyUrl,
    industry,
    hqLocation,
    userId,
    messages: [],
    isCompanyChat: false,
  }

  const finalState = await agent.runResearchWorkflow(initialState)

  return {
    report: finalState.report || 'Research report generation failed',
    references: finalState.references || [],
    companyInfo: finalState.siteData?.extractedInfo || {},
  }
}

export async function handleCompanyChatQuery({
  company,
  companyUrl,
  messages,
  userId,
  chatbotId,
  namespace,
}: {
  company: string
  companyUrl?: string
  messages: BaseMessage[]
  userId?: string
  chatbotId?: string
  namespace?: string
}): Promise<{
  response: string
  sources: any[]
  updatedMessages: BaseMessage[]
}> {
  const agent = new CompanyResearchAgent()
  
  // Generate namespace if not provided
  const finalNamespace = namespace || (companyUrl ? 
    new URL(companyUrl).hostname.replace(/\./g, '-') + '-' + Date.now() : 
    company.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now())
  
  const initialState: CompanyResearchState = {
    company,
    companyUrl,
    userId,
    chatbotId,
    namespace: finalNamespace,
    messages,
    isCompanyChat: true,
  }

  const finalState = await agent.handleCompanyChat(initialState)

  return {
    response: (finalState.messages[finalState.messages.length - 1]?.content as string) || 'I apologize, but I encountered an error processing your request.',
    sources: finalState.sources || finalState.searchResults?.map(r => ({
      id: r.url,
      title: r.title,
      url: r.url,
      snippet: r.content.substring(0, 200),
      type: 'web',
      score: r.score,
    })) || [],
    updatedMessages: finalState.messages,
  }
} 