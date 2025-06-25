export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp: Date
}

export interface Source {
  title: string
  url: string
  snippet: string
  favicon?: string
}

export interface Chatbot {
  id: string
  name: string
  description: string
  url: string
  status: 'active' | 'inactive'
  provider: 'openai' | 'anthropic' | 'gemini' | 'grok'
  conversations: number
  lastUsed: Date
  createdAt: Date
  metadata?: {
    favicon?: string
    title?: string
    description?: string
  }
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  preferences: {
    defaultProvider: string
    theme: 'light' | 'dark' | 'system'
    enableMemory: boolean
  }
  createdAt: Date
}

export interface Conversation {
  id: string
  chatbotId: string
  userId: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export interface TavilySearchResult {
  title: string
  url: string
  content: string
  snippet: string
  score: number
  publishedDate?: string
}

export interface TavilySearchResponse {
  answer: string
  query: string
  followUpQuestions: string[]
  results: TavilySearchResult[]
  searchTime: number
}

export interface Mem0Memory {
  id: string
  memory: string
  userId: string
  hash: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface AppwriteConfig {
  endpoint: string
  projectId: string
  databaseId: string
  collections: {
    users: string
    chatbots: string
    conversations: string
  }
} 