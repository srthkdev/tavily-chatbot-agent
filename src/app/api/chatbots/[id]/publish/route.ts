import { NextRequest, NextResponse } from 'next/server'
import { Databases } from 'node-appwrite'
import { clientConfig } from '@/config/tavily.config'
import { getAppwriteClient } from '@/lib/appwrite'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const chatbotId = params.id
        const { published } = await request.json()

        if (typeof published !== 'boolean') {
            return NextResponse.json({ error: 'Published status is required' }, { status: 400 })
        }

        const client = getAppwriteClient()
        const databases = new Databases(client)

        const publicUrl = published ? `/p/${chatbotId}` : ''

        await databases.updateDocument(
            clientConfig.appwrite.databaseId,
            clientConfig.appwrite.collections.chatbots,
            chatbotId,
            { published, publicUrl }
        )

        return NextResponse.json({ success: true, publicUrl })

    } catch (error) {
        console.error('Publish error:', error)
        return NextResponse.json({ error: 'Failed to update chatbot' }, { status: 500 })
    }
} 