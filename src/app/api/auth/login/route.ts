import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/lib/appwrite'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Sign in the user
    const session = await signIn(email, password)

    // Set session cookie - use secret for server-side operations
    const cookieStore = await cookies()
    const sessionToken = session.secret || session.$id
    
    cookieStore.set('appwrite-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: session.userId,
        sessionId: session.$id,
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid credentials')) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
      if (error.message.includes('User not found')) {
        return NextResponse.json(
          { error: 'Account not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
} 