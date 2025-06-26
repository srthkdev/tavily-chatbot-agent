import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/appwrite'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Check if user has a session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('appwrite-session')
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get current user from Appwrite
    const user = await getCurrentUser()
    
    if (!user) {
      // Clear invalid session cookie
      cookieStore.delete('appwrite-session')
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.$id,
        email: user.email,
        name: user.name,
        preferences: user.preferences || {},
      }
    })

  } catch (error) {
    console.error('Get user profile error:', error)
    
    // Clear session cookie on error
    const cookieStore = await cookies()
    cookieStore.delete('appwrite-session')
    
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }
} 