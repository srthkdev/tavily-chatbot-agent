import { createAdminClient } from '@/lib/appwrite'
import { clientConfig } from '@/config/tavily.config'
import { ID, Query } from 'node-appwrite'

export interface ResearchData {
  $id?: string
  chatbotId: string
  userId: string
  name: string
  url: string
  industry?: string
  hqLocation?: string
  researchReport: string
  companyInfo: Record<string, unknown>
  generatedAt: string
  createdAt?: string
  updatedAt?: string
}

export class ResearchStorageService {
  private static instance: ResearchStorageService
  
  public static getInstance(): ResearchStorageService {
    if (!ResearchStorageService.instance) {
      ResearchStorageService.instance = new ResearchStorageService()
    }
    return ResearchStorageService.instance
  }

  // Save research data
  async saveResearch(research: Omit<ResearchData, '$id' | 'createdAt' | 'updatedAt'>): Promise<ResearchData> {
    try {
      const { databases } = createAdminClient()
      
      const now = new Date().toISOString()
      
      // Check if research already exists for this chatbot
      const existingResearch = await databases.listDocuments(
        clientConfig.appwrite.databaseId,
        'research', // Use a separate collection for research data
        [
          Query.equal('chatbotId', research.chatbotId),
          Query.equal('userId', research.userId),
          Query.limit(1)
        ]
      )

      if (existingResearch.documents.length > 0) {
        // Update existing research
        const result = await databases.updateDocument(
          clientConfig.appwrite.databaseId,
          'research',
          existingResearch.documents[0].$id,
          {
            ...research,
            companyInfo: JSON.stringify(research.companyInfo),
            updatedAt: now,
          }
        )
        
        return {
          $id: result.$id,
          chatbotId: result.chatbotId,
          userId: result.userId,
          name: result.name,
          url: result.url,
          industry: result.industry,
          hqLocation: result.hqLocation,
          researchReport: result.researchReport,
          companyInfo: JSON.parse(result.companyInfo),
          generatedAt: result.generatedAt,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        } as ResearchData
      } else {
        // Create new research
        const result = await databases.createDocument(
          clientConfig.appwrite.databaseId,
          'research',
          ID.unique(),
          {
            ...research,
            companyInfo: JSON.stringify(research.companyInfo),
            createdAt: now,
            updatedAt: now,
          }
        )
        
        return {
          $id: result.$id,
          chatbotId: result.chatbotId,
          userId: result.userId,
          name: result.name,
          url: result.url,
          industry: result.industry,
          hqLocation: result.hqLocation,
          researchReport: result.researchReport,
          companyInfo: JSON.parse(result.companyInfo),
          generatedAt: result.generatedAt,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        } as ResearchData
      }
    } catch (error) {
      console.error('Failed to save research:', error)
      throw error
    }
  }

  // Get research data for a chatbot
  async getResearch(chatbotId: string, userId: string): Promise<ResearchData | null> {
    try {
      const { databases } = createAdminClient()
      
      const result = await databases.listDocuments(
        clientConfig.appwrite.databaseId,
        'research',
        [
          Query.equal('chatbotId', chatbotId),
          Query.equal('userId', userId),
          Query.limit(1)
        ]
      )

      if (result.documents.length === 0) {
        return null
      }

      const doc = result.documents[0]
      return {
        $id: doc.$id,
        chatbotId: doc.chatbotId,
        userId: doc.userId,
        name: doc.name,
        url: doc.url,
        industry: doc.industry,
        hqLocation: doc.hqLocation,
        researchReport: doc.researchReport,
        companyInfo: JSON.parse(doc.companyInfo),
        generatedAt: doc.generatedAt,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      } as ResearchData
    } catch (error) {
      console.error('Failed to get research:', error)
      return null
    }
  }

  // Get all research for a user
  async getUserResearch(userId: string, limit = 20): Promise<ResearchData[]> {
    try {
      const { databases } = createAdminClient()
      
      const result = await databases.listDocuments(
        clientConfig.appwrite.databaseId,
        'research',
        [
          Query.equal('userId', userId),
          Query.orderDesc('updatedAt'),
          Query.limit(limit)
        ]
      )

      return result.documents.map(doc => ({
        $id: doc.$id,
        chatbotId: doc.chatbotId,
        userId: doc.userId,
        name: doc.name,
        url: doc.url,
        industry: doc.industry,
        hqLocation: doc.hqLocation,
        researchReport: doc.researchReport,
        companyInfo: JSON.parse(doc.companyInfo),
        generatedAt: doc.generatedAt,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })) as ResearchData[]
    } catch (error) {
      console.error('Failed to get user research:', error)
      return []
    }
  }

  // Delete research data
  async deleteResearch(researchId: string, userId: string): Promise<boolean> {
    try {
      const { databases } = createAdminClient()
      
      // Verify ownership before deletion
      const research = await databases.getDocument(
        clientConfig.appwrite.databaseId,
        'research',
        researchId
      )

      if (research.userId !== userId) {
        throw new Error('Unauthorized: Cannot delete research data')
      }

      await databases.deleteDocument(
        clientConfig.appwrite.databaseId,
        'research',
        researchId
      )

      return true
    } catch (error) {
      console.error('Failed to delete research:', error)
      return false
    }
  }
}

export const researchStorage = ResearchStorageService.getInstance() 