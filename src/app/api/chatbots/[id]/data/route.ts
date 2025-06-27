import { NextRequest, NextResponse } from 'next/server'
import { clientConfig } from '@/config/tavily.config'
import { upsertDocuments } from '@/lib/upstash-search'
import { nanoid } from 'nanoid'
import { cookies } from 'next/headers'
import { Client, Account, Databases } from 'node-appwrite'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const chatbotId = params.id
        
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
        
        const formData = await request.formData()
        const text = formData.get('text') as string
        const file = formData.get('file') as File

        if (!chatbotId) {
            return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 })
        }

        let documents = []

        if (text) {
            documents.push({
                id: nanoid(),
                data: text,
                metadata: {
                    namespace: chatbotId,
                    title: 'Raw Text Input',
                    url: 'text-input://' + new Date().toISOString(),
                    sourceURL: 'text-input://' + new Date().toISOString(),
                    crawlDate: new Date().toISOString(),
                    fullContent: text
                }
            })
        }

        if (file) {
            const fileText = await file.text()
            documents.push({
                id: nanoid(),
                data: fileText,
                metadata: {
                    namespace: chatbotId,
                    title: file.name,
                    url: 'file://' + file.name,
                    sourceURL: 'file://' + file.name,
                    crawlDate: new Date().toISOString(),
                    fullContent: fileText
                }
            })
        }

        if (documents.length > 0) {
            await upsertDocuments(documents)
            return NextResponse.json({ success: true, message: 'Data added successfully' })
        }

        return NextResponse.json({ error: 'No data provided' }, { status: 400 })

    } catch (error) {
        console.error('Data ingestion error:', error)
        return NextResponse.json({ error: 'Failed to add data' }, { status: 500 })
    }
} 