import { NextResponse } from 'next/server'
import { databases, account } from '@/lib/appwrite'

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get the current user
    const sessionCookie = request.headers.get('cookie')?.split('; ').find(c => c.startsWith('session='))?.split('=')[1]
    
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const user = await account.get()

    // Get project
    const project = await databases.getDocument(
      DATABASE_ID,
      'projects',
      id
    )

    // Check if user owns the project
    if (project.userId !== user.$id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Transform project
    const transformedProject = {
      $id: project.$id,
      name: project.name,
      description: project.description,
      url: project.url,
      type: project.type,
      namespace: project.namespace,
      status: project.status,
      published: project.published,
      publicUrl: project.publicUrl,
      favicon: project.favicon,
      pagesCrawled: project.pagesCrawled || 0,
      documentsStored: project.documentsStored || 0,
      companyData: project.companyData ? JSON.parse(project.companyData) : null,
      settings: project.settings ? JSON.parse(project.settings) : {},
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get the current user
    const sessionCookie = request.headers.get('cookie')?.split('; ').find(c => c.startsWith('session='))?.split('=')[1]
    
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const user = await account.get()

    // Get project to verify ownership
    const project = await databases.getDocument(
      DATABASE_ID,
      'projects',
      id
    )

    // Check if user owns the project
    if (project.userId !== user.$id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Delete project
    await databases.deleteDocument(
      DATABASE_ID,
      'projects',
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Get the current user
    const sessionCookie = request.headers.get('cookie')?.split('; ').find(c => c.startsWith('session='))?.split('=')[1]
    
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const user = await account.get()

    // Get project to verify ownership
    const project = await databases.getDocument(
      DATABASE_ID,
      'projects',
      id
    )

    // Check if user owns the project
    if (project.userId !== user.$id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Update project
    const updatedProject = await databases.updateDocument(
      DATABASE_ID,
      'projects',
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
        type: updatedProject.type,
        namespace: updatedProject.namespace,
        status: updatedProject.status,
        published: updatedProject.published,
        pagesCrawled: updatedProject.pagesCrawled,
        documentsStored: updatedProject.documentsStored,
        companyData: updatedProject.companyData ? JSON.parse(updatedProject.companyData) : null,
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