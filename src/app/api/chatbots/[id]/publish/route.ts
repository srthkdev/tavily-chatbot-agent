import { NextRequest, NextResponse } from 'next/server'
import { Client, Account, Databases } from 'node-appwrite'
import { clientConfig } from '@/config/tavily.config'
import { cookies } from 'next/headers'

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id: chatbotId } = await context.params
        
        // Check authentication
        const cookieStore = await cookies()
        const sessionCookie = cookieStore.get('appwrite-session')
        
        if (!sessionCookie) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        // Create client with session
        const client = new Client()
        client
            .setEndpoint(clientConfig.appwrite.endpoint)
            .setProject(clientConfig.appwrite.projectId)
            .setSession(sessionCookie.value)

        const account = new Account(client)
        const databases = new Databases(client)

        // Get current user
        let user
        try {
            user = await account.get()
        } catch (error) {
            cookieStore.delete('appwrite-session')
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
        }

        // Verify chatbot ownership
        const chatbot = await databases.getDocument(
            clientConfig.appwrite.databaseId,
            clientConfig.appwrite.collections.chatbots,
            chatbotId
        )
        
        if (chatbot.userId !== user.$id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
        
        const { published } = await request.json()

        if (typeof published !== 'boolean') {
            return NextResponse.json({ error: 'Published status is required' }, { status: 400 })
        }

        const publicUrl = published ? `/p/${chatbotId}` : ''

        await databases.updateDocument(
            clientConfig.appwrite.databaseId,
            clientConfig.appwrite.collections.chatbots,
            chatbotId,
            { published, publicUrl }
        )

        return NextResponse.json({ success: true, publicUrl })

    } catch (error) {
        console.warn('Publish error:', error)
        return NextResponse.json({ error: 'Failed to update chatbot' }, { status: 500 })
    }
} 