import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { groq } from '@ai-sdk/groq'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// AI provider configuration
const AI_PROVIDERS = {
  openai: {
    model: openai('gpt-4o'),
    enabled: !!process.env.OPENAI_API_KEY,
    name: 'OpenAI GPT-4o'
  },
  anthropic: {
    model: anthropic('claude-3-5-sonnet-20241022'),
    enabled: !!process.env.ANTHROPIC_API_KEY,
    name: 'Anthropic Claude 3.5 Sonnet'
  },
  gemini: {
    model: google('gemini-2.0-flash'),
    enabled: !!process.env.GOOGLE_API_KEY,
    name: 'Google Gemini 2.0 Flash'
  },
  groq: {
    model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
    enabled: !!process.env.GROQ_API_KEY,
    name: 'Groq Llama 4 Scout'
  },
}

// Get the active AI provider with fallback priority
function getAIModel() {
  // Only check on server side
  if (typeof window !== 'undefined') {
    return null
  }
  
  // Priority: OpenAI > Anthropic > Gemini > Groq
  if (AI_PROVIDERS.openai.enabled) return AI_PROVIDERS.openai.model
  if (AI_PROVIDERS.anthropic.enabled) return AI_PROVIDERS.anthropic.model
  if (AI_PROVIDERS.gemini.enabled) return AI_PROVIDERS.gemini.model
  if (AI_PROVIDERS.groq.enabled) return AI_PROVIDERS.groq.model
  
  throw new Error('No AI provider configured. Please set at least one API key: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, or GROQ_API_KEY')
}

// Rate limiter factory
function createRateLimiter(identifier: string, requests = 50, window = '1 d') {
  if (typeof window !== 'undefined') {
    return null
  }
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  
  return new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(requests, window),
    analytics: true,
    prefix: `tavily-chatbot:ratelimit:${identifier}`,
  })
}

export interface TavilyConfig {
  app: {
    name: string
    url: string
    logoPath: string
  }
  ai: {
    model: ReturnType<typeof getAIModel> | null
    temperature: number
    maxTokens: number
    systemPrompt: string
    providers: typeof AI_PROVIDERS
  }
  tavily: {
    maxResults: number
    searchDepth: 'basic' | 'advanced'
    includeImages: boolean
    includeRawContent: boolean
    includeAnswer: boolean
  }
  mem0: {
    enableUserMemory: boolean
    memoryRetentionDays: number
    maxMemoriesPerUser: number
  }
  appwrite: {
    endpoint: string
    projectId: string
    databaseId: string
    collections: {
      users: string
      chatbots: string
      conversations: string
      messages: string
    }
  }
  rateLimits: {
    create: ReturnType<typeof createRateLimiter>
    query: ReturnType<typeof createRateLimiter>
    search: ReturnType<typeof createRateLimiter>
  }
  features: {
    enableCreation: boolean
    enableAppwrite: boolean
    enableMem0: boolean
    enableRedis: boolean
  }
}

const config: TavilyConfig = {
  app: {
    name: 'Tavily Chatbot',
    url: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
    logoPath: '/logo.svg',
  },

  ai: {
    model: getAIModel(),
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: `You are a helpful AI assistant powered by Tavily search. You can search the web for real-time information and provide accurate, up-to-date responses. When users ask questions, search for relevant information and provide comprehensive answers based on the latest data available.`,
    providers: AI_PROVIDERS,
  },

  tavily: {
    maxResults: 10,
    searchDepth: 'basic',
    includeImages: false,
    includeRawContent: true,
    includeAnswer: true,
  },

  mem0: {
    enableUserMemory: true,
    memoryRetentionDays: 30,
    maxMemoriesPerUser: 100,
  },

  appwrite: {
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '',
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '',
    databaseId: process.env.APPWRITE_DATABASE_ID || 'tavily-chatbot',
    collections: {
      users: 'users',
      chatbots: 'chatbots',
      conversations: 'conversations',
      messages: 'messages',
    },
  },

  rateLimits: {
    create: createRateLimiter('create', 20, '1 d'),
    query: createRateLimiter('query', 100, '1 h'),
    search: createRateLimiter('search', 50, '1 h'),
  },

  features: {
    enableCreation: process.env.DISABLE_CHATBOT_CREATION !== 'true',
    enableAppwrite: !!(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT && process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID),
    enableMem0: !!process.env.MEM0_API_KEY,
    enableRedis: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
  },
}

// Client-safe config (no AI model initialization)
export const clientConfig = {
  app: config.app,
  tavily: config.tavily,
  mem0: config.mem0,
  appwrite: config.appwrite,
  features: config.features,
}

// Server-only config (includes AI model)
export const serverConfig = config

// Default export for backward compatibility
export { clientConfig as config }
export default config 