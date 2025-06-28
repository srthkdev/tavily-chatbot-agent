import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite'
import { clientConfig } from '@/config/tavily.config'
import { runCompanyResearch } from '@/lib/company-research-agent'
import { checkRateLimit } from '@/lib/rate-limit'
import { researchStorage } from '@/lib/research-storage'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { company, companyUrl, industry, hqLocation } = body

    // Check authentication
    const sessionCookie = request.headers.get('cookie')
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const sessionMatch = sessionCookie.match(/appwrite-session=([^;]+)/)
    if (!sessionMatch) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
    }

    // Create session client
    const { account, databases } = createSessionClient(sessionMatch[1])
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
      company: company || project.name,
      companyUrl: companyUrl || project.url,
      industry,
      hqLocation,
      userId: user.$id,
    })

    // Save research data using the research storage service
    const researchData = await researchStorage.saveResearch({
      chatbotId: id,
      userId: user.$id,
      name: company || project.name,
      url: companyUrl || project.url,
      industry,
      hqLocation,
      researchReport: result.report,
      companyInfo: result.companyInfo,
      // references: result.references, // Removed due to collection limit
      generatedAt: new Date().toISOString(),
    })

    // Update project description to indicate it has research data
    await databases.updateDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      id,
      {
        description: `AI assistant for ${researchData.name} with comprehensive research data`,
        updatedAt: new Date().toISOString(),
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        projectId: id,
        researchData: {
          name: researchData.name,
          url: researchData.url,
          industry: researchData.industry,
          hqLocation: researchData.hqLocation,
          researchReport: researchData.researchReport,
          companyInfo: researchData.companyInfo,
          generatedAt: researchData.generatedAt,
        },
        report: researchData.researchReport,
        // references: researchData.references, // Removed due to collection limit
        companyInfo: researchData.companyInfo,
      }
    })

  } catch (error) {
    console.error('Research generation error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate research',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
    const sessionCookie = request.headers.get('cookie')
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const sessionMatch = sessionCookie.match(/appwrite-session=([^;]+)/)
    if (!sessionMatch) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
    }

    // Create session client
    const { account, databases } = createSessionClient(sessionMatch[1])
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

    // Get research data from research storage
    const researchData = await researchStorage.getResearch(id, user.$id)
    
    let companyData = {
      name: project.name,
      url: project.url,
      industry: null as string | null,
      hqLocation: null as string | null,
      researchReport: null as string | null,
      companyInfo: {},
      generatedAt: project.createdAt
    }

    if (researchData) {
      companyData = {
        name: researchData.name,
        url: researchData.url,
        industry: researchData.industry || null,
        hqLocation: researchData.hqLocation || null,
        researchReport: researchData.researchReport || null,
        companyInfo: researchData.companyInfo,
        generatedAt: researchData.generatedAt
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