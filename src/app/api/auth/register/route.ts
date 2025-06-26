import { NextRequest, NextResponse } from 'next/server'
import { Client, Account, Databases, ID } from 'node-appwrite'
import { clientConfig } from '@/config/tavily.config'
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

    // Create client for server operations (using node-appwrite for server-side)
    const client = new Client()
    client
      .setEndpoint(clientConfig.appwrite.endpoint)
      .setProject(clientConfig.appwrite.projectId)

    // Use API key for account creation operations
    if (process.env.APPWRITE_API_KEY) {
      client.setKey(process.env.APPWRITE_API_KEY)
    }

    const account = new Account(client)

    // Create the user account
    const user = await account.create(ID.unique(), email, password, name)
    
    // Sign in the user immediately to get a session
    const session = await account.createEmailPasswordSession(email, password)
    
    // For database operations, create a new client with session (not API key)
    const userClient = new Client()
    userClient
      .setEndpoint(clientConfig.appwrite.endpoint)
      .setProject(clientConfig.appwrite.projectId)
      .setSession(session.secret || session.$id)

    const databases = new Databases(userClient)
    
    // Create user profile in database
    await databases.createDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.users,
      ID.unique(),
      {
        accountId: user.$id, // Reference to the account
        email,
        name,
        preferences: '{}',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    )

    // Set session cookie - use secret for server-side operations
    const cookieStore = await cookies()
    cookieStore.set('appwrite-session', session.secret || session.$id, {
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