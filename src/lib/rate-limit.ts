import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Rate limiter instances
let createRateLimit: Ratelimit | null = null
let queryRateLimit: Ratelimit | null = null
let searchRateLimit: Ratelimit | null = null

// Initialize rate limiters if Redis is available
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    // Validate Redis URL format
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL
    if (!redisUrl.startsWith('https://')) {
      console.warn('⚠️ Invalid Redis URL format for rate limiting. Expected HTTPS URL, got:', redisUrl)
      console.warn('💡 Please use the HTTPS REST URL from Upstash, not the CLI command')
      console.warn('🔧 Rate limiting will be disabled')
    } else {
      const redis = new Redis({
        url: redisUrl,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })

      createRateLimit = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(20, '1 d'),
        analytics: true,
        prefix: 'tavily-chatbot:ratelimit:create',
      })

      queryRateLimit = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(100, '1 h'),
        analytics: true,
        prefix: 'tavily-chatbot:ratelimit:query',
      })

      searchRateLimit = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(50, '1 h'),
        analytics: true,
        prefix: 'tavily-chatbot:ratelimit:search',
      })
      
      console.log('✅ Rate limiting initialized successfully')
    }
  } catch (error) {
    console.error('❌ Failed to initialize rate limiting:', error)
    console.warn('💡 App will continue without rate limiting')
  }
}

export async function checkRateLimit(
  type: 'create' | 'query' | 'search',
  identifier: string
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  try {
    let rateLimit: Ratelimit | null = null
    
    switch (type) {
      case 'create':
        rateLimit = createRateLimit
        break
      case 'query':
        rateLimit = queryRateLimit
        break
      case 'search':
        rateLimit = searchRateLimit
        break
    }

    if (!rateLimit) {
      // If rate limiting is not configured, allow all requests
      return { success: true }
    }

    const { success, limit, remaining, reset } = await rateLimit.limit(identifier)
    
    return {
      success,
      limit,
      remaining,
      reset,
    }
  } catch (error) {
    console.error(`Rate limit check failed for ${type}:`, error)
    // On error, allow the request but log the issue
    return { success: true }
  }
}

export { createRateLimit, queryRateLimit, searchRateLimit } 