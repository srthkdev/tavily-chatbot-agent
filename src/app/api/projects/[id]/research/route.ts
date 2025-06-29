import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite'
import { clientConfig } from '@/config/tavily.config'
import { runCompanyResearch } from '@/lib/company-research-agent'
import { checkRateLimit } from '@/lib/rate-limit'
import { cookies } from 'next/headers'
import { Query } from 'node-appwrite'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { company, companyUrl, industry, hqLocation } = body

    // Check authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('appwrite-session')
    
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Create session client
    const { account, databases } = createSessionClient(sessionCookie.value)
    const user = await account.get()

    // Check rate limit
    const clientIP = request.headers.get('x-forwarded-for') || 'anonymous'
    const rateLimit = await checkRateLimit('research', clientIP)
    
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

    // Verify project ownership
    const project = await databases.getDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      id
    )

    if (project.userId !== user.$id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Run company research
    const result = await runCompanyResearch({
      company,
      companyUrl,
      industry,
      hqLocation,
      userId: user.$id,
    })

    // Save research to the research_reports collection
    const now = new Date().toISOString()
    
    // Check if research already exists
    const existingResearch = await databases.listDocuments(
      clientConfig.appwrite.databaseId,
      'research_reports',
      [
        Query.equal('chatbotId', id),
        Query.equal('userId', user.$id),
        Query.limit(1)
      ]
    )

    let researchDoc
    if (existingResearch.documents.length > 0) {
      // Update existing research
      researchDoc = await databases.updateDocument(
        clientConfig.appwrite.databaseId,
        'research_reports',
        existingResearch.documents[0].$id,
        {
          companyName: company,
          companyUrl: companyUrl || '',
          industry: industry || '',
          hqLocation: hqLocation || '',
          researchReport: result.report,
          companyInfo: JSON.stringify(result.companyInfo || {}),
          references: JSON.stringify(result.references || []),
          generatedAt: now,
          status: 'completed'
        }
      )
    } else {
      // Create new research
      researchDoc = await databases.createDocument(
        clientConfig.appwrite.databaseId,
        'research_reports',
        'unique()',
        {
          chatbotId: id,
          userId: user.$id,
          companyName: company,
          companyUrl: companyUrl || '',
          industry: industry || '',
          hqLocation: hqLocation || '',
          researchReport: result.report,
          companyInfo: JSON.stringify(result.companyInfo || {}),
          references: JSON.stringify(result.references || []),
          generatedAt: now,
          status: 'completed',
          createdAt: now
        }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        researchData: {
          $id: researchDoc.$id,
          chatbotId: id,
          userId: user.$id,
          name: company,
          url: companyUrl,
          industry,
          hqLocation,
          researchReport: result.report,
          companyInfo: result.companyInfo || {},
          references: result.references || [],
          generatedAt: now
        },
        companyInfo: result.companyInfo,
        report: result.report,
        references: result.references
      }
    })

  } catch (error) {
    console.error('Research generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate research' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('appwrite-session')
    
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Create session client
    const { account, databases } = createSessionClient(sessionCookie.value)
    const user = await account.get()

    // Get project
    const project = await databases.getDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      id
    )

    if (project.userId !== user.$id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Get research data from research_reports collection
    const researchResult = await databases.listDocuments(
      clientConfig.appwrite.databaseId,
      'research_reports',
      [
        Query.equal('chatbotId', id),
        Query.equal('userId', user.$id),
        Query.limit(1)
      ]
    )
    
    let companyData = {
      name: project.name,
      url: project.url,
      industry: null as string | null,
      hqLocation: null as string | null,
      researchReport: null as string | null,
      companyInfo: {},
      generatedAt: project.createdAt,
      references: []
    }

    if (researchResult.documents.length > 0) {
      const research = researchResult.documents[0]
      companyData = {
        name: research.companyName,
        url: research.companyUrl,
        industry: research.industry || null,
        hqLocation: research.hqLocation || null,
        researchReport: research.researchReport || null,
        companyInfo: research.companyInfo ? JSON.parse(research.companyInfo) : {},
        generatedAt: research.generatedAt,
        references: research.references ? JSON.parse(research.references) : []
      }
    }

    // Return project with research data
    return NextResponse.json({
      success: true,
      data: {
        $id: project.$id,
        name: project.name,
        url: project.url,
        description: project.description,
        type: 'company_research',
        namespace: project.namespace,
        createdAt: project.createdAt,
        companyData
      }
    })

  } catch (error) {
    console.error('Get research error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get research data' },
      { status: 500 }
    )
  }
} 