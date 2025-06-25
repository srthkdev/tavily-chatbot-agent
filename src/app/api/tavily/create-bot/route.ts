import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let ratelimit: Ratelimit | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    if (ratelimit) {
      const ip = (request.headers.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0]
      const { success, limit, reset, remaining } = await ratelimit.limit(ip)
      
      if (!success) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': new Date(reset).toISOString(),
            }
          }
        )
      }
    }

    const { url, name, description } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // For now, just create a basic chatbot object
    // In a full implementation, this would involve web scraping and indexing
    const result = {
      id: Math.random().toString(36).substring(2),
      name: name || `${new URL(url).hostname} Assistant`,
      description: description || `AI assistant for ${new URL(url).hostname}`,
      url,
      status: 'active' as const,
      provider: 'openai' as const,
      conversations: 0,
      lastUsed: new Date(),
      createdAt: new Date()
    }

    return NextResponse.json({
      success: true,
      chatbot: result
    })

  } catch (error) {
    console.error('Error creating chatbot:', error)
    return NextResponse.json(
      { error: 'Failed to create chatbot' },
      { status: 500 }
    )
  }
} 