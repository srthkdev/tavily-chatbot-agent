import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite'
import { Query } from 'node-appwrite'
import { cookies } from 'next/headers'
import { clientConfig } from '@/config/tavily.config'

export async function GET() {
  try {
    // Get the current user from session
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('appwrite-session')
    
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Create session client
    const { account, databases } = createSessionClient(sessionCookie.value)

    // Get current user
    let user
    try {
      user = await account.get()
    } catch (error) {
      console.error('Session validation failed:', error)
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
    }
    
    // Get user's projects from database (using chatbots collection as projects)
    const projects = await databases.listDocuments(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      [
        Query.equal('userId', user.$id),
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ]
    )

    // Transform projects to match expected format
    const transformedProjects = projects.documents.map(project => ({
      $id: project.$id,
      name: project.name,
      description: project.description || '',
      url: project.url,
      type: 'company_research',
      namespace: project.namespace,
      status: project.status,
      published: project.published || false,
      publicUrl: project.publicUrl || null,
      favicon: project.favicon || null,
      pagesCrawled: parseInt(project.pagesCrawled || '0'),
      documentsStored: 0, // Could be calculated from vector DB
      companyData: null, // Will be populated separately if needed
      settings: {},
      createdAt: project.$createdAt,
      updatedAt: project.$updatedAt
    }))

    return NextResponse.json({
      success: true,
      data: transformedProjects,
      total: projects.total
    })

  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, url } = body

    // Get the current user from session
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('appwrite-session')
    
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Create session client
    const { account, databases } = createSessionClient(sessionCookie.value)
    
    // Get current user
    let user
    try {
      user = await account.get()
    } catch (error) {
      console.error('Session validation failed:', error)
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
    }

    // Generate namespace
    const namespace = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`

    // Create project (using chatbots collection)
    const project = await databases.createDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      'unique()',
      {
        name,
        description: description || '',
        url: url || '',
        namespace,
        userId: user.$id,
        status: 'active',
        published: false,
        pagesCrawled: '0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        $id: project.$id,
        name: project.name,
        description: project.description,
        url: project.url,
        type: 'company_research',
        namespace: project.namespace,
        status: project.status,
        published: project.published,
        pagesCrawled: parseInt(project.pagesCrawled || '0'),
        documentsStored: 0,
        companyData: null,
        createdAt: project.$createdAt
      }
    })

  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    )
  }
} 