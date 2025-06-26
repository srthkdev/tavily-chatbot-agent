import { NextRequest, NextResponse } from 'next/server'
import { signUp, signIn } from '@/lib/appwrite'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Create the user account
    const user = await signUp(email, password, name)

    // Automatically sign in the user after registration
    const session = await signIn(email, password)

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('appwrite-session', session.$id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.$id,
        email: user.email,
        name: user.name,
        sessionId: session.$id,
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('user with the same id, email')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }
      if (error.message.includes('Password must be at least')) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters long' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
} 