// Note: This is a simplified version due to type compatibility issues with mem0ai package
// In a production environment, you would want to use the official Mem0 SDK once types are stable

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

// Initialize Mem0 client using fetch API directly
function getMem0Headers() {
  const apiKey = process.env.MEM0_API_KEY
  
  if (!apiKey) {
    throw new Error('MEM0_API_KEY environment variable is required')
  }
  
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

// Add memories to the system
export async function addMemories(
  messages: MemoryMessage[],
  options: MemoryOptions
): Promise<{ success: boolean; memories: unknown[] }> {
  try {
    const response = await fetch('https://api.mem0.ai/v1/memories', {
      method: 'POST',
      headers: getMem0Headers(),
      body: JSON.stringify({
        messages,
        user_id: options.user_id,
        agent_id: options.agent_id,
        run_id: options.run_id,
      }),
    })
    
    if (!response.ok) {
      console.warn(`Mem0 add memories failed with status: ${response.status}`)
      return { success: false, memories: [] }
    }
    
    const result = await response.json()
    
    return {
      success: true,
      memories: result.results || [],
    }
  } catch (error) {
    console.error('Mem0 add memories error:', error)
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
    const searchParams = new URLSearchParams({
      query,
      user_id: options.user_id,
      limit: limit.toString(),
    })
    
    if (options.agent_id) {
      searchParams.append('agent_id', options.agent_id)
    }
    
    if (options.run_id) {
      searchParams.append('run_id', options.run_id)
    }
    
    const response = await fetch(`https://api.mem0.ai/v1/memories/search?${searchParams}`, {
      headers: getMem0Headers(),
    })
    
    // Gracefully handle authentication or other HTTP errors without throwing so that
    // the calling code can continue operating even when Mem0 is mis-configured or
    // temporarily unavailable.
    if (!response.ok) {
      if (response.status === 401) {
        console.warn('⚠️  Mem0 request returned 401 (unauthorized). Please verify that MEM0_API_KEY is set correctly.')
        console.warn('⚠️  API Key present:', !!process.env.MEM0_API_KEY)
        console.warn('⚠️  API Key prefix:', process.env.MEM0_API_KEY?.substring(0, 10) + '...')
      } else {
        console.warn(`⚠️  Mem0 search failed with status: ${response.status}`)
      }
      return []
    }
    
    const result = await response.json()
    return result.results || []
  } catch (error) {
    console.error('Mem0 search memories error:', error)
    return []
  }
}

// Get all memories for a user
export async function getUserMemories(
  options: MemoryOptions,
  limit = 50
): Promise<Memory[]> {
  try {
    const searchParams = new URLSearchParams({
      user_id: options.user_id,
      limit: limit.toString(),
    })
    
    if (options.agent_id) {
      searchParams.append('agent_id', options.agent_id)
    }
    
    if (options.run_id) {
      searchParams.append('run_id', options.run_id)
    }
    
    const response = await fetch(`https://api.mem0.ai/v1/memories?${searchParams}`, {
      headers: getMem0Headers(),
    })
    
    if (!response.ok) {
      if (response.status === 401) {
        console.warn('⚠️  Mem0 request returned 401 (unauthorized) while fetching user memories.')
      } else {
        console.warn(`⚠️  Mem0 get memories failed with status: ${response.status}`)
      }
      return []
    }
    
    const result = await response.json()
    return result.results || []
  } catch (error) {
    console.error('Mem0 get memories error:', error)
    return []
  }
}

// Delete a specific memory
export async function deleteMemory(
  memoryId: string
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`https://api.mem0.ai/v1/memories/${memoryId}`, {
      method: 'DELETE',
      headers: getMem0Headers(),
    })
    
    if (!response.ok) {
      console.warn(`Mem0 delete memory failed with status: ${response.status}`)
      return { success: false }
    }
    
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