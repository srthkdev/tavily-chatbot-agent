import { NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite'
import { cookies } from 'next/headers'
import { clientConfig } from '@/config/tavily.config'
import { Query } from 'node-appwrite'

export async function GET() {
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

    // Create session client with the cookie token
    const { account, databases } = createSessionClient(sessionCookie.value)

    // Get current user from Appwrite
    const user = await account.get()
    
    // Retrieve user profile stored in the users collection. We store documents
    // with a random ID and keep a reference to the Appwrite account in the
    // `accountId` field, so we need to query for it instead of assuming the
    // document ID matches the user ID.
    const profiles = await databases.listDocuments(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.users,
      [Query.equal('accountId', user.$id), Query.limit(1)]
    )

    const profile = profiles.documents[0]
    
    // Parse preferences JSON string to object
    let preferences = {}
    try {
      preferences = profile && profile.preferences ? JSON.parse(profile.preferences) : {}
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