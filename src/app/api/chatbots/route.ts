import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getUserChatbots } from '@/lib/appwrite'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
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

    // Get user's chatbots
    const chatbots = await getUserChatbots(user.$id)

    return NextResponse.json({
      success: true,
      data: chatbots
    })

  } catch (error) {
    console.error('Get chatbots error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve chatbots' },
      { status: 500 }
    )
  }
} 