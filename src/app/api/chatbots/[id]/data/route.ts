import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite'
import { cookies } from 'next/headers'
import { clientConfig } from '@/config/tavily.config'
import { upsertDocuments, SearchDocument } from '@/lib/upstash-search'
import { ID, Query } from 'node-appwrite'

// Helper function to extract text from PDF buffer
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // For production, you'd want to use a proper PDF parser like pdf-parse
    // For now, we'll return a placeholder
    return "PDF content extraction would be implemented here using pdf-parse or similar library"
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error('Failed to extract text from PDF')
  }
}

// Helper function to chunk text into smaller pieces
function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const chunks: string[] = []
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (currentChunk.length + trimmedSentence.length + 1 <= maxChunkSize) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.')
      }
      currentChunk = trimmedSentence
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk + '.')
  }
  
  return chunks
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('appwrite-session')
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Create session client
    const { account, databases } = createSessionClient(sessionCookie.value)

    // Get current user
    let user
    try {
      user = await account.get()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    const chatbotId = params.id

    // Get chatbot to verify ownership
    let chatbot
    try {
      const response = await databases.listDocuments(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.chatbots,
        [
          Query.equal('namespace', [chatbotId]),
          Query.equal('createdBy', [user.$id])
        ]
      )
      
      if (response.documents.length === 0) {
        return NextResponse.json(
          { error: 'Chatbot not found or access denied' },
          { status: 404 }
        )
      }
      
      chatbot = response.documents[0]
    } catch (error) {
      console.error('Database query error:', error)
      return NextResponse.json(
        { error: 'Failed to verify chatbot ownership' },
        { status: 500 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const textContent = formData.get('text') as string
    const file = formData.get('file') as File
    const title = formData.get('title') as string || 'Admin Training Data'

    if (!textContent && !file) {
      return NextResponse.json(
        { error: 'Either text content or file is required' },
        { status: 400 }
      )
    }

    let content = ''
    let sourceType = 'text'
    let fileName = ''

    // Handle text input
    if (textContent) {
      content = textContent.trim()
      sourceType = 'text'
    }

    // Handle file input
    if (file) {
      fileName = file.name
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      
      if (file.type === 'application/pdf') {
        sourceType = 'pdf'
        try {
          content = await extractTextFromPDF(fileBuffer)
        } catch (error) {
          return NextResponse.json(
            { error: 'Failed to extract text from PDF' },
            { status: 400 }
          )
        }
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        sourceType = 'text'
        content = fileBuffer.toString('utf-8')
      } else {
        return NextResponse.json(
          { error: 'Unsupported file type. Only PDF and TXT files are supported.' },
          { status: 400 }
        )
      }
    }

    if (!content || content.length < 10) {
      return NextResponse.json(
        { error: 'Content is too short or empty' },
        { status: 400 }
      )
    }

    // Chunk the content for better retrieval
    const chunks = chunkText(content, 1500)
    const namespace = chatbot.namespace

    // Create documents for vector storage
    const documents: SearchDocument[] = chunks.map((chunk, index) => ({
      id: `${namespace}-admin-${Date.now()}-${index}`,
      data: chunk,
      metadata: {
        namespace,
        title: `${title} (Part ${index + 1})`,
        url: fileName ? `file://${fileName}` : 'admin://text-input',
        sourceURL: fileName ? `file://${fileName}` : 'admin://text-input',
        crawlDate: new Date().toISOString(),
        pageTitle: title,
        description: chunk.substring(0, 200),
        fullContent: chunk,
        text: chunk,
        sourceType: 'admin',
        contentType: sourceType,
        fileName: fileName || undefined,
        addedBy: user.$id,
        chunkIndex: index,
        totalChunks: chunks.length,
      },
    }))

    // Store documents in vector database
    try {
      await upsertDocuments(documents)
    } catch (error) {
      console.error('Vector storage error:', error)
      return NextResponse.json(
        { error: 'Failed to store content in vector database' },
        { status: 500 }
      )
    }

    // Update chatbot document count in database
    try {
      const currentDocCount = chatbot.documentsStored || 0
      await databases.updateDocument(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.chatbots,
        chatbot.$id,
        {
          documentsStored: currentDocCount + documents.length,
          lastUpdated: new Date().toISOString(),
        }
      )
    } catch (error) {
      console.error('Failed to update chatbot document count:', error)
      // Continue even if this fails
    }

    // Log the training data addition
    try {
      await databases.createDocument(
        clientConfig.appwrite.databaseId,
        'training_logs', // You'll need to create this collection
        ID.unique(),
        {
          chatbotId: chatbot.$id,
          namespace: namespace,
          contentType: sourceType,
          title: title,
          fileName: fileName || null,
          chunksAdded: documents.length,
          contentLength: content.length,
          addedBy: user.$id,
          addedAt: new Date().toISOString(),
        }
      )
    } catch (error) {
      console.error('Failed to log training data:', error)
      // Continue even if logging fails
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${documents.length} chunks of training data`,
      details: {
        contentType: sourceType,
        fileName: fileName || null,
        chunksAdded: documents.length,
        totalContentLength: content.length,
        title: title,
      }
    })

  } catch (error) {
    console.error('Add training data error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve training data logs
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('appwrite-session')
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Create session client
    const { account, databases } = createSessionClient(sessionCookie.value)

    // Get current user
    let user
    try {
      user = await account.get()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    const chatbotId = params.id

    // Get chatbot to verify ownership
    let chatbot
    try {
      const response = await databases.listDocuments(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.chatbots,
        [
          Query.equal('namespace', [chatbotId]),
          Query.equal('createdBy', [user.$id])
        ]
      )
      
      if (response.documents.length === 0) {
        return NextResponse.json(
          { error: 'Chatbot not found or access denied' },
          { status: 404 }
        )
      }
      
      chatbot = response.documents[0]
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to verify chatbot ownership' },
        { status: 500 }
      )
    }

    // Get training logs
    try {
      const response = await databases.listDocuments(
        clientConfig.appwrite.databaseId,
        'training_logs',
        [
          Query.equal('chatbotId', [chatbot.$id]),
          Query.orderDesc('addedAt'),
          Query.limit(50)
        ]
      )
      
      return NextResponse.json({
        success: true,
        data: response.documents,
        total: response.total
      })
    } catch (error) {
      console.error('Failed to fetch training logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch training data logs' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Get training data error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 