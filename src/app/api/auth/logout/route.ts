import { NextRequest, NextResponse } from 'next/server'
import { signOut } from '@/lib/appwrite'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Sign out from Appwrite
    await signOut()

    // Clear session cookie
    const cookieStore = await cookies()
    cookieStore.delete('appwrite-session')

    return NextResponse.json({
      success: true,
      message: 'Logout successful'
    })

  } catch (error) {
    console.error('Logout error:', error)
    
    // Even if Appwrite logout fails, clear the cookie
    const cookieStore = await cookies()
    cookieStore.delete('appwrite-session')

    return NextResponse.json({
      success: true,
      message: 'Logout completed'
    })
  }
}

export async function GET(request: NextRequest) {
  // Handle GET request for logout (for logout links)
  return POST(request)
} 