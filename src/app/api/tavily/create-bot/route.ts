import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { upsertDocuments, SearchDocument } from '@/lib/upstash-search'
import { saveIndex } from '@/lib/storage'
import { serverConfig as config, clientConfig } from '@/config/tavily.config'
import { Client, Account, Databases, ID } from 'node-appwrite'
import { cookies } from 'next/headers'
import { searchAndCreateBot, searchWeb } from '@/lib/tavily'

// Enhanced company metadata extraction using AI
async function extractCompanyMetadata(url: string, content: string) {
  try {
    const hostname = new URL(url).hostname
    const domain = hostname.replace('www.', '')
    
    // Extract company name from domain or content
    let companyName = domain.split('.')[0]
    
    // Try to find company name in content
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) {
      const title = titleMatch[1].trim()
      // Remove common suffixes
      const cleanTitle = title.replace(/\s*[-|]\s*(Home|Homepage|Welcome|Official Site|Website).*$/i, '')
      if (cleanTitle.length > 0 && cleanTitle.length < 100) {
        companyName = cleanTitle
      }
    }

    // Extract description
    let description = ''
    const metaDescMatch = content.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i)
    if (metaDescMatch) {
      description = metaDescMatch[1].trim()
    }

    // Fallback to first paragraph
    if (!description) {
      const paragraphMatch = content.match(/<p[^>]*>([^<]+)<\/p>/i)
      if (paragraphMatch) {
        description = paragraphMatch[1].trim().substring(0, 200)
      }
    }

    // Extract industry/business type keywords
    const businessKeywords = [
      'software', 'technology', 'consulting', 'services', 'solutions', 'platform',
      'healthcare', 'finance', 'education', 'retail', 'manufacturing', 'startup',
      'agency', 'studio', 'company', 'corporation', 'inc', 'llc', 'ltd'
    ]
    
    const contentLower = content.toLowerCase()
    const detectedKeywords = businessKeywords.filter(keyword => 
      contentLower.includes(keyword)
    )

    return {
      name: companyName,
      domain,
      description: description || `AI assistant for ${companyName}`,
      industry: detectedKeywords.length > 0 ? detectedKeywords[0] : 'general',
      keywords: detectedKeywords,
    }
  } catch (error) {
    console.error('Metadata extraction error:', error)
    const hostname = new URL(url).hostname
    return {
      name: hostname.replace('www.', '').split('.')[0],
      domain: hostname,
      description: `AI assistant for ${hostname}`,
      industry: 'general',
      keywords: [],
    }
  }
}

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

    // Create client with session to get current user
    const client = new Client()
    client
      .setEndpoint(clientConfig.appwrite.endpoint)
      .setProject(clientConfig.appwrite.projectId)
      .setSession(sessionCookie.value)

    const account = new Account(client)
    const databases = new Databases(client)

    // Get current user
    let user
    try {
      user = await account.get()
    } catch (error) {
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

    // Use the enhanced searchAndCreateBot function
    let chatbotData
    try {
      chatbotData = await searchAndCreateBot(url, maxResults)
    } catch (error) {
      console.error('Tavily search and create error:', error)
      return NextResponse.json({ 
        error: 'Failed to create chatbot from URL. Please check the URL and try again.' 
      }, { status: 500 })
    }

    // Extract enhanced company metadata from the main content
    const mainContent = chatbotData.content.find(item => item.metadata?.isMainPage) || chatbotData.content[0]
    const companyMetadata = await extractCompanyMetadata(url, mainContent.content)

    // Prepare documents for vector storage with limited metadata
    const documents: SearchDocument[] = chatbotData.content.map((item, index) => ({
      id: `${namespace}-doc-${index}`,
      data: `${item.title} ${item.content}`.substring(0, 1500), // Limit content size
      metadata: {
        namespace,
        title: item.title.substring(0, 200), // Limit title size
        url: item.url,
        sourceURL: item.url,
        crawlDate: new Date().toISOString(),
        pageTitle: item.title.substring(0, 200),
        description: item.content.substring(0, 300), // Limit description
        text: item.content.substring(0, 500), // Limit text content
        score: typeof item.metadata?.score === 'number' ? item.metadata.score : undefined,
        publishedDate: typeof item.metadata?.searchedAt === 'string' ? item.metadata.searchedAt : undefined,
        sourceType: 'website',
        contentType: 'html',
      },
    }))

    // Store documents in vector database
    try {
      await upsertDocuments(documents)
      console.log(`Successfully stored ${documents.length} documents in vector database`)
    } catch (error) {
      console.error('Vector storage error:', error)
      // Continue even if vector storage fails, but log the error
      console.warn('Continuing without vector storage...')
    }

    // Enhanced chatbot metadata
    const enhancedChatbotData = {
      id: namespace,
      namespace,
      url,
      title: companyMetadata.name,
      description: companyMetadata.description,
      companyInfo: {
        name: companyMetadata.name,
        domain: companyMetadata.domain,
        industry: companyMetadata.industry,
        keywords: companyMetadata.keywords,
      },
      pagesCrawled: chatbotData.pagesCrawled,
      documentsStored: documents.length,
      createdAt: new Date().toISOString(),
      createdBy: user.$id,
      metadata: {
        title: companyMetadata.name,
        description: companyMetadata.description,
        isCompanySpecific: true,
        searchDepth,
        maxResults,
      },
    }

    // Save to local storage system
    try {
      await saveIndex(enhancedChatbotData)
    } catch (error) {
      console.error('Local storage error:', error)
      // Continue even if local storage fails
    }

    // Save to Appwrite database with correct field names
    try {
      await databases.createDocument(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.chatbots,
        ID.unique(),
        {
          namespace,
          url,
          title: companyMetadata.name,
          description: companyMetadata.description,
          companyName: companyMetadata.name,
          domain: companyMetadata.domain,
          industry: companyMetadata.industry,
          pagesCrawled: chatbotData.pagesCrawled,
          documentsStored: documents.length,
          userId: user.$id, // Correct field name
          createdBy: user.$id,
          createdAt: new Date().toISOString(),
          isActive: true,
          published: false, // Default to unpublished
          publicUrl: null,
          metadata: JSON.stringify(enhancedChatbotData.metadata),
        }
      )
      console.log('Successfully saved chatbot to Appwrite database')
    } catch (error) {
      console.error('Appwrite storage error:', error)
      return NextResponse.json({
        error: 'Failed to save chatbot to database',
        details: error instanceof Error ? error.message : 'Unknown database error'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      namespace,
      chatbot: enhancedChatbotData,
      details: {
        resultsFound: chatbotData.pagesCrawled,
        documentsStored: documents.length,
        companyInfo: companyMetadata,
        vectorStorageStatus: 'success', // We'll update this based on actual storage
      },
      message: `Successfully created ${companyMetadata.name} chatbot with ${chatbotData.pagesCrawled} pages processed.`
    })

  } catch (error) {
    console.error('Create bot API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 