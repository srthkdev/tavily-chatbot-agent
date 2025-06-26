import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getChatbot, updateChatbot, deleteChatbot } from '@/lib/appwrite'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chatbotId = params.id

    // Check authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('appwrite-session')
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get current user
    const user = await getCurrentUser()
    
    if (!user) {
      cookieStore.delete('appwrite-session')
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get chatbot
    const chatbot = await getChatbot(chatbotId)

    // Check if user owns this chatbot
    if (chatbot.userId !== user.$id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: chatbot
    })

  } catch (error) {
    console.error('Get chatbot error:', error)
    return NextResponse.json(
      { error: 'Chatbot not found' },
      { status: 404 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chatbotId = params.id
    const updateData = await request.json()

    // Check authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('appwrite-session')
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get current user
    const user = await getCurrentUser()
    
    if (!user) {
      cookieStore.delete('appwrite-session')
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get chatbot to verify ownership
    const chatbot = await getChatbot(chatbotId)

    if (chatbot.userId !== user.$id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Update chatbot
    const updatedChatbot = await updateChatbot(chatbotId, {
      name: updateData.name,
      description: updateData.description,
      status: updateData.status,
    })

    return NextResponse.json({
      success: true,
      data: updatedChatbot
    })

  } catch (error) {
    console.error('Update chatbot error:', error)
    return NextResponse.json(
      { error: 'Failed to update chatbot' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chatbotId = params.id

    // Check authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('appwrite-session')
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get current user
    const user = await getCurrentUser()
    
    if (!user) {
      cookieStore.delete('appwrite-session')
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get chatbot to verify ownership
    const chatbot = await getChatbot(chatbotId)

    if (chatbot.userId !== user.$id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete chatbot
    await deleteChatbot(chatbotId)

    return NextResponse.json({
      success: true,
      message: 'Chatbot deleted successfully'
    })

  } catch (error) {
    console.error('Delete chatbot error:', error)
    return NextResponse.json(
      { error: 'Failed to delete chatbot' },
      { status: 500 }
    )
  }
} 