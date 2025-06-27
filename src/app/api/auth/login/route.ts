import { NextRequest, NextResponse } from 'next/server'
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

    // Sign in using server SDK so we get the session secret
    const { Client: NodeClient, Account: NodeAccount } = await import('node-appwrite')

    const nodeClient = new NodeClient()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)

    if (!process.env.APPWRITE_API_KEY) {
      return NextResponse.json(
        { error: 'Server mis-configuration: missing APPWRITE_API_KEY' },
        { status: 500 }
      )
    }

    nodeClient.setKey(process.env.APPWRITE_API_KEY)

    const nodeAccount = new NodeAccount(nodeClient)

    const session = await nodeAccount.createEmailPasswordSession(email, password)

    // Set session cookie - use secret for server-side operations
    const cookieStore = await cookies()
    // For SSR, Appwrite expects the raw session secret as the value that will be
    // provided later to client.setSession(secret). The official docs explicitly
    // mention to "Use the secret property of the session object as the cookie
    // value". Pre-pending the userId is **not** required and causes the SDK to
    // treat the token as invalid, resulting in 401 responses.
    const sessionToken = session.secret
    
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