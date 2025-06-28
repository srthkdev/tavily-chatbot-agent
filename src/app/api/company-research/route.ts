import { NextRequest, NextResponse } from 'next/server'
import { runCompanyResearch } from '@/lib/company-research-agent'
import { checkRateLimit } from '@/lib/rate-limit'
import { cookies } from 'next/headers'
import { Client, Account } from 'node-appwrite'
import { serverConfig } from '@/config/tavily.config'

// Helper to get user ID from session
async function getUserId() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('appwrite-session')
  if (!sessionCookie) return null

  try {
    const client = new Client()
      .setEndpoint(serverConfig.appwrite.endpoint)
      .setProject(serverConfig.appwrite.projectId)
      .setSession(sessionCookie.value)
    const account = new Account(client)
    const user = await account.get()
    return user.$id
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { company, companyUrl, industry, hqLocation } = body

    if (!company) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

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

    const userId = await getUserId()

    // Run company research
    const result = await runCompanyResearch({
      company,
      companyUrl,
      industry,
      hqLocation,
      userId: userId || undefined,
    })

    return NextResponse.json({
      success: true,
      data: {
        company,
        companyUrl,
        industry,
        hqLocation,
        report: result.report,
        references: result.references,
        companyInfo: result.companyInfo,
        generatedAt: new Date().toISOString(),
      }
    })

  } catch (error) {
    console.error('Company research API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 