import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite'
import { cookies } from 'next/headers'
import { clientConfig } from '@/config/tavily.config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check authentication using cookies
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

    // Get project from chatbots collection (since we're using it as projects)
    const project = await databases.getDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      id
    )

    // Check if user owns the project
    if (project.userId !== user.$id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Transform project data
    const transformedProject = {
      $id: project.$id,
      name: project.name,
      description: project.description,
      url: project.url,
      type: project.type || 'company_research',
      namespace: project.namespace,
      status: project.status,
      published: project.published || false,
      publicUrl: project.publicUrl || null,
      favicon: project.favicon || null,
      pagesCrawled: parseInt(project.pagesCrawled || '0'),
      documentsStored: 0, // Could be calculated from vector DB
      companyData: project.companyData ? (typeof project.companyData === 'string' ? JSON.parse(project.companyData) : project.companyData) : null,
      settings: project.settings ? (typeof project.settings === 'string' ? JSON.parse(project.settings) : project.settings) : {},
      createdAt: project.createdAt || project.$createdAt,
      updatedAt: project.updatedAt || project.$updatedAt
    }

    return NextResponse.json({
      success: true,
      data: transformedProject
    })

  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Get current user
    let user
    try {
      user = await account.get()
    } catch (error) {
      console.error('Session validation failed:', error)
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
    }

    // Get project to verify ownership
    const project = await databases.getDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      id
    )

    // Check if user owns the project
    if (project.userId !== user.$id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Delete project
    await databases.deleteDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      id
    )

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check authentication
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

    // Get project to verify ownership
    const project = await databases.getDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      id
    )

    // Check if user owns the project
    if (project.userId !== user.$id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Update project
    const updatedProject = await databases.updateDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      id,
      {
        ...body,
        updatedAt: new Date().toISOString()
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        $id: updatedProject.$id,
        name: updatedProject.name,
        description: updatedProject.description,
        url: updatedProject.url,
        type: updatedProject.type || 'company_research',
        namespace: updatedProject.namespace,
        status: updatedProject.status,
        published: updatedProject.published,
        pagesCrawled: parseInt(updatedProject.pagesCrawled || '0'),
        documentsStored: 0,
        companyData: updatedProject.companyData ? (typeof updatedProject.companyData === 'string' ? JSON.parse(updatedProject.companyData) : updatedProject.companyData) : null,
        updatedAt: updatedProject.updatedAt
      }
    })

  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update project' },
      { status: 500 }
    )
  }
} 