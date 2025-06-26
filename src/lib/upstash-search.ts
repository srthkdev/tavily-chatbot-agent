import { Index } from '@upstash/vector'

// Initialize Upstash Vector Index
const searchIndex = new Index({
  url: process.env.UPSTASH_SEARCH_REST_URL!,
  token: process.env.UPSTASH_SEARCH_REST_TOKEN!,
})

export { searchIndex }

export interface SearchDocument {
  id: string
  data?: string  // For text-based upserts with embedding model
  vector?: number[]  // For manual vector upserts
  metadata: {
    namespace: string
    title: string
    url: string
    sourceURL: string
    crawlDate: string
    pageTitle?: string
    description?: string
    favicon?: string
    ogImage?: string
    fullContent: string
    text?: string
    score?: number
    publishedDate?: string
  }
}

export interface SearchResult {
  id: string
  score: number
  metadata: SearchDocument['metadata']
  vector?: number[]
}

export async function searchDocuments(
  query: string,
  namespace?: string,
  limit = 10
): Promise<SearchResult[]> {
  try {
    // Try text-based query first (works if index has embedding model)
    try {
      const searchParams: any = {
        data: query,  // Use text directly
        topK: limit,
        includeMetadata: true,
        includeVectors: false,
      }

      // Add namespace filter if provided
      if (namespace) {
        searchParams.filter = `namespace = "${namespace}"`
      }

      const results = await searchIndex.query(searchParams)
      
      return (results || []).map((result: any) => ({
        id: result.id,
        score: result.score || 1.0,
        metadata: result.metadata || {},
        vector: result.vector,
      }))
    } catch (textQueryError) {
      console.log('Text-based query failed, trying vector-based query:', textQueryError)
      
      // Fallback to vector-based query with dummy vector
      const dummyVector = new Array(1536).fill(0.001)
      
      const searchParams: any = {
        vector: dummyVector,
        topK: limit,
        includeMetadata: true,
        includeVectors: false,
      }

      // Add namespace filter if provided
      if (namespace) {
        searchParams.filter = `namespace = "${namespace}"`
      }

      const results = await searchIndex.query(searchParams)
      
      return (results || []).map((result: any) => ({
        id: result.id,
        score: result.score || 1.0,
        metadata: result.metadata || {},
        vector: result.vector,
      }))
    }
  } catch (error) {
    console.error('Search error:', error)
    // Return empty array to allow the process to continue
    return []
  }
}

export async function upsertDocuments(documents: SearchDocument[]): Promise<void> {
  try {
    // Try text-based upsert first (works if index has embedding model)
    try {
      const textBasedDocuments = documents.map(doc => ({
        id: doc.id,
        data: doc.data || doc.metadata.text || `${doc.metadata.title} ${doc.metadata.fullContent}`.substring(0, 2000),
        metadata: doc.metadata
      }))
      
      const batchSize = 10
      for (let i = 0; i < textBasedDocuments.length; i += batchSize) {
        const batch = textBasedDocuments.slice(i, i + batchSize)
        await searchIndex.upsert(batch)
      }
      
      console.log('Successfully used text-based upsert with embedding model')
      return
    } catch (textUpsertError) {
      console.log('Text-based upsert failed, trying vector-based upsert:', textUpsertError)
      
      // Fallback to vector-based upsert
      const batchSize = 10
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize).map(doc => ({
          id: doc.id,
          vector: doc.vector || generateSimpleEmbedding(doc.metadata.text || doc.metadata.title),
          metadata: doc.metadata
        }))
        await searchIndex.upsert(batch)
      }
      
      console.log('Successfully used vector-based upsert')
    }
  } catch (error) {
    console.error('Upsert error:', error)
    throw new Error('Failed to store documents')
  }
}

export async function deleteNamespace(namespace: string): Promise<void> {
  try {
    // Query for all documents in the namespace first
    const dummyVector = new Array(1536).fill(0.001)
    const results = await searchIndex.query({
      vector: dummyVector,
      topK: 1000,
      includeMetadata: true,
      filter: `namespace = "${namespace}"`
    })

    // Delete each document by ID
    if (results && Array.isArray(results)) {
      const ids = results.map((result: any) => result.id).filter(Boolean)
      
      if (ids.length > 0) {
        for (const id of ids) {
          await searchIndex.delete(id)
        }
      }
    }
  } catch (error) {
    console.error('Delete namespace error:', error)
    throw new Error('Failed to delete namespace')
  }
}

// Helper function to generate simple embeddings (fallback only)
function generateSimpleEmbedding(text: string): number[] {
  const hash = hashString(text || '')
  return new Array(1536).fill(0).map((_, i) => 
    Math.sin(hash + i) * 0.001 + 0.001
  )
}

// Simple string hash function
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Legacy function for backward compatibility
export async function generateEmbedding(text: string): Promise<number[]> {
  return generateSimpleEmbedding(text)
} 