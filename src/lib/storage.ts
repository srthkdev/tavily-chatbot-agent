import { Redis } from '@upstash/redis'
import { clientConfig as config } from '@/config/tavily.config'

// Types for index data
export interface IndexMetadata {
  title?: string
  description?: string
  favicon?: string
  ogImage?: string
}

export interface ChatbotIndex {
  url: string
  namespace: string
  pagesCrawled: number
  createdAt: string
  metadata: IndexMetadata
}

// Initialize Redis client if available
let redis: Redis | null = null
if (config.features.enableRedis) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

export class StorageManager {
  private static instance: StorageManager
  
  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager()
    }
    return StorageManager.instance
  }

  async saveIndex(index: ChatbotIndex): Promise<void> {
    try {
      // Save to Redis if available
      if (redis) {
        const key = `${config.storage.redisPrefix.index}${index.namespace}`
        await redis.set(key, JSON.stringify(index))
        
        // Also add to indexes list
        const indexesKey = config.storage.redisPrefix.indexes
        const existing = await redis.get(indexesKey) as ChatbotIndex[] | null
        const indexes = existing || []
        
        // Remove any existing entry with same namespace
        const filtered = indexes.filter((idx: ChatbotIndex) => {
          return idx.namespace !== index.namespace
        })
        
        // Add new index
        filtered.push(index)
        
        // Keep only the most recent maxIndexes
        const sorted = filtered.sort((a: ChatbotIndex, b: ChatbotIndex) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
        
        const limited = sorted.slice(0, config.storage.maxIndexes)
        await redis.set(indexesKey, JSON.stringify(limited))
      }
      
      // Always save to localStorage as fallback
      if (typeof window !== 'undefined') {
        const existing = localStorage.getItem(config.storage.localStorageKey)
        const indexes: ChatbotIndex[] = existing ? JSON.parse(existing) : []
        
        // Remove any existing entry with same namespace
        const filtered = indexes.filter(idx => idx.namespace !== index.namespace)
        
        // Add new index
        filtered.unshift(index)
        
        // Keep only the most recent maxIndexes
        const limited = filtered.slice(0, config.storage.maxIndexes)
        
        localStorage.setItem(config.storage.localStorageKey, JSON.stringify(limited))
      }
    } catch (error) {
      console.error('Failed to save index:', error)
      throw new Error('Failed to save chatbot index')
    }
  }

  async getIndexes(): Promise<ChatbotIndex[]> {
    try {
      // Try Redis first
      if (redis) {
        const indexes = await redis.get(config.storage.redisPrefix.indexes) as ChatbotIndex[] | null
        if (indexes) {
          return Array.isArray(indexes) ? indexes : []
        }
      }
      
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const existing = localStorage.getItem(config.storage.localStorageKey)
        return existing ? JSON.parse(existing) : []
      }
      
      return []
    } catch (error) {
      console.error('Failed to get indexes:', error)
      return []
    }
  }

  async getIndex(namespace: string): Promise<ChatbotIndex | null> {
    try {
      // Try Redis first
      if (redis) {
        const key = `${config.storage.redisPrefix.index}${namespace}`
        const index = await redis.get(key) as ChatbotIndex | null
        if (index) {
          return index
        }
      }
      
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const indexes = await this.getIndexes()
        return indexes.find(idx => idx.namespace === namespace) || null
      }
      
      return null
    } catch (error) {
      console.error('Failed to get index:', error)
      return null
    }
  }

  async deleteIndex(namespace: string): Promise<void> {
    try {
      // Delete from Redis
      if (redis) {
        const key = `${config.storage.redisPrefix.index}${namespace}`
        await redis.del(key)
        
        // Remove from indexes list
        const indexesKey = config.storage.redisPrefix.indexes
        const existing = await redis.get(indexesKey) as ChatbotIndex[] | null
        if (existing) {
          const filtered = existing.filter((idx: ChatbotIndex) => {
            return idx.namespace !== namespace
          })
          await redis.set(indexesKey, JSON.stringify(filtered))
        }
      }
      
      // Delete from localStorage
      if (typeof window !== 'undefined') {
        const existing = localStorage.getItem(config.storage.localStorageKey)
        if (existing) {
          const indexes: ChatbotIndex[] = JSON.parse(existing)
          const filtered = indexes.filter(idx => idx.namespace !== namespace)
          localStorage.setItem(config.storage.localStorageKey, JSON.stringify(filtered))
        }
      }
    } catch (error) {
      console.error('Failed to delete index:', error)
      throw new Error('Failed to delete chatbot index')
    }
  }
}

// Export singleton instance and helper functions
const storage = StorageManager.getInstance()

export const saveIndex = (index: ChatbotIndex) => storage.saveIndex(index)
export const getIndexes = () => storage.getIndexes()
export const getIndex = (namespace: string) => storage.getIndex(namespace)
export const deleteIndex = (namespace: string) => storage.deleteIndex(namespace)

export default storage 