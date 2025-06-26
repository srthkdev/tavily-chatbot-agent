import { NextRequest, NextResponse } from 'next/server'
import { Client, Account, Databases, Query } from 'node-appwrite'
import { clientConfig } from '@/config/tavily.config'
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

    // Use node-appwrite for server-side operations
    const client = new Client()
    client
      .setEndpoint(clientConfig.appwrite.endpoint)
      .setProject(clientConfig.appwrite.projectId)

    // For user account operations, use ONLY session (not API key)
    // API key gives application role which doesn't have account scope
    client.setSession(sessionCookie.value)

    const account = new Account(client)
    const databases = new Databases(client)

    // Get current user from Appwrite
    const user = await account.get()
    
    // Get user profile from database by accountId
    const profileQuery = await databases.listDocuments(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.users,
      [Query.equal('accountId', user.$id)]
    )
    
    if (profileQuery.documents.length === 0) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }
    
    const profile = profileQuery.documents[0]
    
    // Parse preferences JSON string to object
    let preferences = {}
    try {
      preferences = profile.preferences ? JSON.parse(profile.preferences) : {}
    } catch (e) {
      console.warn('Failed to parse user preferences:', e)
      preferences = {}
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.$id,
        email: user.email,
        name: user.name,
        preferences,
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