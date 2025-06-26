import { Index } from '@upstash/vector'

// Initialize Upstash Vector Index
const searchIndex = new Index({
  url: process.env.UPSTASH_SEARCH_REST_URL!,
  token: process.env.UPSTASH_SEARCH_REST_TOKEN!,
})

export { searchIndex }

export interface SearchDocument {
  id: string
  vector: number[]
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
    const searchParams: any = {
      data: query,
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
      score: result.score,
      metadata: result.metadata || {},
      vector: result.vector,
    }))
  } catch (error) {
    console.error('Search error:', error)
    throw new Error('Failed to search documents')
  }
}

export async function upsertDocuments(documents: SearchDocument[]): Promise<void> {
  try {
    const batchSize = 10
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize)
      await searchIndex.upsert(batch)
    }
  } catch (error) {
    console.error('Upsert error:', error)
    throw new Error('Failed to store documents')
  }
}

export async function deleteNamespace(namespace: string): Promise<void> {
  try {
    // Query for all documents in the namespace
    const results = await searchIndex.query({
      data: 'namespace',
      topK: 1000,
      includeMetadata: true,
      filter: `namespace = "${namespace}"`,
    })

    // Delete each document
    const ids = (results || []).map((result: any) => result.id)
    
    if (ids.length > 0) {
      for (const id of ids) {
        await searchIndex.delete(id)
      }
    }
  } catch (error) {
    console.error('Delete namespace error:', error)
    throw new Error('Failed to delete namespace')
  }
}

// Helper function to generate embeddings (you'll need to implement this)
export async function generateEmbedding(text: string): Promise<number[]> {
  // For now, return a placeholder embedding
  // In production, you'd call OpenAI's embedding API or similar
  return new Array(1536).fill(0).map(() => Math.random())
} 