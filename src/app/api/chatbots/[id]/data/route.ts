import { NextRequest, NextResponse } from 'next/server'
import { clientConfig } from '@/config/tavily.config'
import { upsertDocuments } from '@/lib/upstash-search'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const chatbotId = params.id
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