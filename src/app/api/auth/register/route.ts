import { NextRequest, NextResponse } from 'next/server'
import { Client, Account, Databases, ID, Query } from 'node-appwrite'
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

    let user, session;
    
    try {
      // Try to create the user account
      user = await account.create(ID.unique(), email, password, name)
    } catch (accountError: any) {
      // If user already exists, try to sign them in instead to check if they have a complete profile
      if (accountError.type === 'user_already_exists') {
        try {
          session = await account.createEmailPasswordSession(email, password)
          
          // Get existing user info
          const existingClient = new Client()
          existingClient
            .setEndpoint(clientConfig.appwrite.endpoint)
            .setProject(clientConfig.appwrite.projectId)
            .setSession(session.secret || session.$id)
          
          const existingAccount = new Account(existingClient)
          user = await existingAccount.get()
          
        } catch (signInError) {
          throw new Error('An account with this email already exists but the password is incorrect')
        }
      } else {
        throw accountError
      }
    }
    
    // If we don't have a session yet, create one
    if (!session) {
      session = await account.createEmailPasswordSession(email, password)
    }
    
    // For database operations, create a new client with session
    const userClient = new Client()
    userClient
      .setEndpoint(clientConfig.appwrite.endpoint)
      .setProject(clientConfig.appwrite.projectId)
      .setSession(session.secret || session.$id)

    const databases = new Databases(userClient)
    
    // Check if user profile already exists using proper query syntax
    try {
      const existingUser = await databases.listDocuments(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.users,
        [Query.equal('accountId', user.$id)]
      )
      
      if (existingUser.documents.length === 0) {
        // Create user profile in database only if it doesn't exist
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
      } else {
        // User already has a complete profile, they should log in instead
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in instead.' },
          { status: 409 }
        )
      }
    } catch (dbError) {
      console.error('Database operation error:', dbError)
      throw new Error('Failed to create user profile')
    }

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
      // Handle specific error messages
      if (error.message.includes('An account with this email already exists but the password is incorrect')) {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
        )
      }
      if (error.message.includes('Password must be at least')) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters long' },
          { status: 400 }
        )
      }
      if (error.message.includes('Failed to create user profile')) {
        return NextResponse.json(
          { error: 'Failed to create user profile. Please try again.' },
          { status: 500 }
        )
      }
    }

    // Handle Appwrite specific errors
    if (error && typeof error === 'object' && 'type' in error) {
      const appwriteError = error as any
      if (appwriteError.type === 'user_already_exists') {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }
      if (appwriteError.type === 'general_argument_invalid' && 
          appwriteError.message.includes('Password')) {
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