import { createAdminClient } from '@/lib/appwrite'
import { clientConfig } from '@/config/tavily.config'
import { ID, Query } from 'node-appwrite'

export interface ChatMessage {
  $id?: string
  chatbotId: string
  userId: string
  role: 'user' | 'assistant'
  content: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sources?: any[]
  isCompanySpecific?: boolean
  timestamp: string
  sessionId?: string
  conversationId?: string
}

export interface ChatSession {
  $id?: string
  chatbotId: string
  userId: string
  title: string
  lastMessage: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

export class ChatStorageService {
  private static instance: ChatStorageService
  
  public static getInstance(): ChatStorageService {
    if (!ChatStorageService.instance) {
      ChatStorageService.instance = new ChatStorageService()
    }
    return ChatStorageService.instance
  }

  // Save a chat message
  async saveMessage(message: Omit<ChatMessage, '$id' | 'timestamp'>): Promise<ChatMessage> {
    try {
      const { databases } = createAdminClient()
      
      const messageData = {
        ...message,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        sources: message.sources ? JSON.stringify(message.sources) : null,
        conversationId: message.conversationId || message.chatbotId, // Use chatbotId as fallback
      }

      const result = await databases.createDocument(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.messages || 'messages',
        ID.unique(),
        messageData
      )

      return {
        $id: result.$id,
        chatbotId: result.chatbotId,
        userId: result.userId,
        role: result.role,
        content: result.content,
        timestamp: result.timestamp,
        sessionId: result.sessionId,
        conversationId: result.conversationId,
        isCompanySpecific: result.isCompanySpecific,
        sources: result.sources ? JSON.parse(result.sources) : undefined,
      } as ChatMessage
    } catch (error) {
      console.error('Failed to save message:', error)
      throw error
    }
  }

  // Get chat messages for a chatbot
  async getMessages(chatbotId: string, userId: string, limit = 50): Promise<ChatMessage[]> {
    try {
      const { databases } = createAdminClient()
      
      const result = await databases.listDocuments(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.messages || 'messages',
        [
          Query.equal('chatbotId', chatbotId),
          Query.equal('userId', userId),
          Query.orderDesc('timestamp'),
          Query.limit(limit)
        ]
      )

      return result.documents.map(doc => ({
        $id: doc.$id,
        chatbotId: doc.chatbotId,
        userId: doc.userId,
        role: doc.role,
        content: doc.content,
        timestamp: doc.timestamp,
        sessionId: doc.sessionId,
        conversationId: doc.conversationId,
        isCompanySpecific: doc.isCompanySpecific,
        sources: doc.sources ? JSON.parse(doc.sources) : undefined,
      })) as ChatMessage[]
    } catch (error) {
      console.error('Failed to get messages:', error)
      return []
    }
  }

  // Save or update chat session
  async saveSession(session: Omit<ChatSession, '$id' | 'createdAt' | 'updatedAt'>): Promise<ChatSession> {
    try {
      const { databases } = createAdminClient()
      
      // Try to find existing session
      const existingSessions = await databases.listDocuments(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.sessions || 'sessions',
        [
          Query.equal('chatbotId', session.chatbotId),
          Query.equal('userId', session.userId),
          Query.orderDesc('updatedAt'),
          Query.limit(1)
        ]
      )

      const now = new Date().toISOString()

      if (existingSessions.documents.length > 0) {
        // Update existing session
        const existingSession = existingSessions.documents[0]
        const result = await databases.updateDocument(
          clientConfig.appwrite.databaseId,
          clientConfig.appwrite.collections.sessions || 'sessions',
          existingSession.$id,
          {
            title: session.title,
            lastMessage: session.lastMessage,
            messageCount: session.messageCount,
            updatedAt: now,
          }
        )
        return {
          $id: result.$id,
          chatbotId: result.chatbotId,
          userId: result.userId,
          title: result.title,
          lastMessage: result.lastMessage,
          messageCount: result.messageCount,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        } as ChatSession
      } else {
        // Create new session
        const result = await databases.createDocument(
          clientConfig.appwrite.databaseId,
          clientConfig.appwrite.collections.sessions || 'sessions',
          ID.unique(),
          {
            ...session,
            createdAt: now,
            updatedAt: now,
          }
        )
        return {
          $id: result.$id,
          chatbotId: result.chatbotId,
          userId: result.userId,
          title: result.title,
          lastMessage: result.lastMessage,
          messageCount: result.messageCount,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        } as ChatSession
      }
    } catch (error) {
      console.error('Failed to save session:', error)
      throw error
    }
  }

  // Get chat sessions for a user
  async getSessions(userId: string, limit = 20): Promise<ChatSession[]> {
    try {
      const { databases } = createAdminClient()
      
      const result = await databases.listDocuments(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.sessions || 'sessions',
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
        title: doc.title,
        lastMessage: doc.lastMessage,
        messageCount: doc.messageCount,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })) as ChatSession[]
    } catch (error) {
      console.error('Failed to get sessions:', error)
      return []
    }
  }

  // Delete a chat session and its messages
  async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      const { databases } = createAdminClient()
      
      // First delete all messages in the session
      const messages = await databases.listDocuments(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.messages || 'messages',
        [
          Query.equal('sessionId', sessionId),
          Query.equal('userId', userId)
        ]
      )

      // Delete messages
      for (const message of messages.documents) {
        await databases.deleteDocument(
          clientConfig.appwrite.databaseId,
          clientConfig.appwrite.collections.messages || 'messages',
          message.$id
        )
      }

      // Delete session
      await databases.deleteDocument(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.sessions || 'sessions',
        sessionId
      )

      return true
    } catch (error) {
      console.error('Failed to delete session:', error)
      return false
    }
  }
}

export const chatStorage = ChatStorageService.getInstance() 