import { NextResponse } from 'next/server'

export async function GET() {
  const environmentStatus = {
    TAVILY_API_KEY: !!process.env.TAVILY_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    MEM0_API_KEY: !!process.env.MEM0_API_KEY,
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    UPSTASH_SEARCH_REST_URL: !!process.env.UPSTASH_SEARCH_REST_URL,
    UPSTASH_SEARCH_REST_TOKEN: !!process.env.UPSTASH_SEARCH_REST_TOKEN,
    NEXT_PUBLIC_APPWRITE_ENDPOINT: !!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: !!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    DISABLE_CHATBOT_CREATION: process.env.DISABLE_CHATBOT_CREATION === 'true',
  }

  // Determine which features are available
  const features = {
    ai: environmentStatus.OPENAI_API_KEY || environmentStatus.ANTHROPIC_API_KEY || 
        environmentStatus.GOOGLE_API_KEY || environmentStatus.GROQ_API_KEY,
    search: environmentStatus.TAVILY_API_KEY,
    memory: environmentStatus.MEM0_API_KEY, // Using official mem0ai library
    storage: environmentStatus.UPSTASH_REDIS_REST_URL && environmentStatus.UPSTASH_REDIS_REST_TOKEN,
    vectorDB: environmentStatus.UPSTASH_SEARCH_REST_URL && environmentStatus.UPSTASH_SEARCH_REST_TOKEN,
    appwrite: environmentStatus.NEXT_PUBLIC_APPWRITE_ENDPOINT && environmentStatus.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  }

  return NextResponse.json({
    environmentStatus,
    features,
    ready: features.ai && features.search && features.vectorDB,
    warnings: [
      !features.search && 'Tavily API key not configured - search functionality will be limited',
      !features.ai && 'No AI provider configured - please set at least one API key',
      !features.vectorDB && 'Upstash Vector DB not configured - chatbot creation will fail',
      !features.memory && 'Mem0 not configured - conversation memory features disabled',
      !features.storage && 'Redis not configured - using localStorage only',
      !features.appwrite && 'Appwrite not configured - authentication disabled',
    ].filter(Boolean),
  })
} 