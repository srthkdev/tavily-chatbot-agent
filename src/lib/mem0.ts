import MemoryClient from 'mem0ai'

export interface MemoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface MemoryOptions {
  user_id: string
  agent_id?: string
  run_id?: string
}

export interface Memory {
  id: string
  memory: string
  created_at: string
  updated_at: string
}

export interface MemorySearchResult {
  id: string
  memory: string
  score: number
}

// Initialize Mem0 client
function getMem0Client() {
  const apiKey = process.env.MEM0_API_KEY
  
  if (!apiKey) {
    throw new Error('MEM0_API_KEY environment variable is required')
  }
  
  return new MemoryClient({ apiKey })
}

// Add memories to the system
export async function addMemories(
  messages: MemoryMessage[],
  options: MemoryOptions
): Promise<{ success: boolean; memories: unknown[] }> {
  try {
    const client = getMem0Client()
    
    const result = await client.add(messages, {
      user_id: options.user_id,
      agent_id: options.agent_id,
      run_id: options.run_id,
    })
    
    return {
      success: true,
      memories: result || [],
    }
  } catch (error) {
    console.error('Mem0 add memories error:', error)
    if (error instanceof Error && error.message.includes('401')) {
      console.warn('⚠️  Mem0 request returned 401 (unauthorized). Please verify that MEM0_API_KEY is set correctly.')
      console.warn('⚠️  API Key present:', !!process.env.MEM0_API_KEY)
      console.warn('⚠️  API Key prefix:', process.env.MEM0_API_KEY?.substring(0, 10) + '...')
    }
    return { success: false, memories: [] }
  }
}

// Search for relevant memories
export async function searchMemories(
  query: string,
  options: MemoryOptions,
  limit = 10
): Promise<MemorySearchResult[]> {
  try {
    const client = getMem0Client()
    
    const result = await client.search(query, {
      user_id: options.user_id,
      agent_id: options.agent_id,
      run_id: options.run_id,
      limit,
    })
    
    // Transform the result to match our interface
    return (result || []).map((item: any) => ({
      id: item.id,
      memory: item.memory || item.text || '',
      score: item.score || 0,
    }))
  } catch (error) {
    console.error('Mem0 search memories error:', error)
    if (error instanceof Error && error.message.includes('401')) {
      console.warn('⚠️  Mem0 request returned 401 (unauthorized). Please verify that MEM0_API_KEY is set correctly.')
      console.warn('⚠️  API Key present:', !!process.env.MEM0_API_KEY)
      console.warn('⚠️  API Key prefix:', process.env.MEM0_API_KEY?.substring(0, 10) + '...')
    }
    return []
  }
}

// Get all memories for a user
export async function getUserMemories(
  options: MemoryOptions,
  limit = 50
): Promise<Memory[]> {
  try {
    const client = getMem0Client()
    
    const result = await client.getAll({
      user_id: options.user_id,
      agent_id: options.agent_id,
      run_id: options.run_id,
      limit,
    })
    
    // Transform the result to match our interface
    return (result || []).map((item: any) => ({
      id: item.id,
      memory: item.memory || item.text || '',
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || new Date().toISOString(),
    }))
  } catch (error) {
    console.error('Mem0 get memories error:', error)
    if (error instanceof Error && error.message.includes('401')) {
      console.warn('⚠️  Mem0 request returned 401 (unauthorized) while fetching user memories.')
    }
    return []
  }
}

// Delete a specific memory
export async function deleteMemory(
  memoryId: string
): Promise<{ success: boolean }> {
  try {
    const client = getMem0Client()
    
    await client.delete(memoryId)
    
    return { success: true }
  } catch (error) {
    console.error('Mem0 delete memory error:', error)
    return { success: false }
  }
}

// Get memories as context string for AI prompts
export async function getMemoryContext(
  query: string,
  options: MemoryOptions,
  limit = 5
): Promise<string> {
  try {
    const memories = await searchMemories(query, options, limit)
    
    if (memories.length === 0) {
      return ''
    }
    
    const memoryString = memories
      .map((mem, index) => `${index + 1}. ${mem.memory}`)
      .join('\n')
    
    return `Previous conversation context:\n${memoryString}\n\nUse this context to provide more personalized responses.`
  } catch (error) {
    console.error('Get memory context error:', error)
    return ''
  }
}

// Add conversation turn to memory
export async function addConversationTurn(
  userMessage: string,
  assistantMessage: string,
  options: MemoryOptions
): Promise<{ success: boolean }> {
  const messages: MemoryMessage[] = [
    { role: 'user', content: userMessage },
    { role: 'assistant', content: assistantMessage },
  ]
  
  try {
    await addMemories(messages, options)
    return { success: true }
  } catch (error) {
    console.error('Add conversation turn error:', error)
    return { success: false }
  }
}

// Initialize memory system for a new user
export async function initializeUserMemory(userId: string): Promise<{ success: boolean }> {
  try {
    // For initialization, we'll add a simple user message
    const welcomeMessages: MemoryMessage[] = [
      {
        role: 'user',
        content: `Starting to use the Tavily chatbot system. Please remember my preferences and conversation history.`
      }
    ]
    
    await addMemories(welcomeMessages, { user_id: userId })
    return { success: true }
  } catch (error) {
    console.error('Initialize user memory error:', error)
    return { success: false }
  }
}

// Check if Mem0 is available
export function isMem0Available(): boolean {
  return !!process.env.MEM0_API_KEY
} 