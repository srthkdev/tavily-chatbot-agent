import { Client, Account, Databases, Storage, Query, ID } from 'appwrite'
import { clientConfig } from '@/config/tavily.config'

// Initialize Appwrite client
export const client = new Client()

if (clientConfig.appwrite.endpoint && clientConfig.appwrite.projectId) {
  client
    .setEndpoint(clientConfig.appwrite.endpoint)
    .setProject(clientConfig.appwrite.projectId)
}

export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)

// Types
export interface User {
  $id: string
  email: string
  name: string
  preferences?: {
    theme?: 'light' | 'dark'
    aiProvider?: string
    language?: string
  }
  createdAt: string
  updatedAt: string
}

export interface Chatbot {
  $id: string
  userId: string
  namespace: string
  name: string
  description: string
  url?: string
  favicon?: string
  status: 'active' | 'inactive' | 'processing'
  pagesCrawled: string
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  $id: string
  userId: string
  chatbotId: string
  title: string
  lastMessage?: string
  messageCount: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  $id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    url: string
    title: string
    snippet: string
  }>
  createdAt: string
}

// Authentication functions
export async function signUp(email: string, password: string, name: string) {
  try {
    // Create the account
    const response = await account.create(ID.unique(), email, password, name)
    
    // Sign in the user immediately to get a session
    await account.createEmailPasswordSession(email, password)
    
    // Now create user profile in database (with session active)
    await databases.createDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.users,
      response.$id,
      {
        email,
        name,
        preferences: '{}',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    )
    
    return response
  } catch (error) {
    console.error('Sign up error:', error)
    throw error
  }
}

export async function signIn(email: string, password: string) {
  try {
    return await account.createEmailPasswordSession(email, password)
  } catch (error) {
    console.error('Sign in error:', error)
    throw error
  }
}

export async function signOut() {
  try {
    await account.deleteSession('current')
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

export async function getCurrentUser() {
  try {
    const user = await account.get()
    
    // Get user profile from database
    const profile = await databases.getDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.users,
      user.$id
    )
    
    // Parse preferences JSON string to object
    let preferences = {}
    try {
      preferences = profile.preferences ? JSON.parse(profile.preferences) : {}
    } catch (e) {
      console.warn('Failed to parse user preferences:', e)
      preferences = {}
    }
    
    return {
      ...user,
      preferences,
    }
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

// Chatbot functions
export async function createChatbot(data: Omit<Chatbot, '$id' | 'createdAt' | 'updatedAt'>) {
  try {
    return await databases.createDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      ID.unique(),
      {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    )
  } catch (error) {
    console.error('Create chatbot error:', error)
    throw error
  }
}

export async function getUserChatbots(userId: string) {
  try {
    const response = await databases.listDocuments(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      [
        Query.equal('userId', userId),
        Query.orderDesc('createdAt'),
        Query.limit(50)
      ]
    )
    
    return response.documents
  } catch (error) {
    console.error('Get user chatbots error:', error)
    throw error
  }
}

export async function getChatbot(chatbotId: string) {
  try {
    return await databases.getDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      chatbotId
    )
  } catch (error) {
    console.error('Get chatbot error:', error)
    throw error
  }
}

export async function updateChatbot(chatbotId: string, data: Partial<Chatbot>) {
  try {
    return await databases.updateDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      chatbotId,
      {
        ...data,
        updatedAt: new Date().toISOString(),
      }
    )
  } catch (error) {
    console.error('Update chatbot error:', error)
    throw error
  }
}

export async function deleteChatbot(chatbotId: string) {
  try {
    // Delete all conversations and messages for this chatbot
    const conversations = await databases.listDocuments(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.conversations,
      [Query.equal('chatbotId', chatbotId)]
    )
    
    for (const conversation of conversations.documents) {
      await deleteConversation(conversation.$id)
    }
    
    // Delete the chatbot
    await databases.deleteDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.chatbots,
      chatbotId
    )
  } catch (error) {
    console.error('Delete chatbot error:', error)
    throw error
  }
}

// Conversation functions
export async function createConversation(data: Omit<Conversation, '$id' | 'createdAt' | 'updatedAt'>) {
  try {
    return await databases.createDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.conversations,
      ID.unique(),
      {
        ...data,
        messageCount: data.messageCount || '0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    )
  } catch (error) {
    console.error('Create conversation error:', error)
    throw error
  }
}

export async function getConversations(chatbotId: string, userId: string) {
  try {
    const response = await databases.listDocuments(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.conversations,
      [
        Query.equal('chatbotId', chatbotId),
        Query.equal('userId', userId),
        Query.orderDesc('updatedAt'),
        Query.limit(50)
      ]
    )
    
    return response.documents
  } catch (error) {
    console.error('Get conversations error:', error)
    throw error
  }
}

export async function getConversation(conversationId: string) {
  try {
    return await databases.getDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.conversations,
      conversationId
    )
  } catch (error) {
    console.error('Get conversation error:', error)
    throw error
  }
}

export async function updateConversation(conversationId: string, data: Partial<Conversation>) {
  try {
    return await databases.updateDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.conversations,
      conversationId,
      {
        ...data,
        updatedAt: new Date().toISOString(),
      }
    )
  } catch (error) {
    console.error('Update conversation error:', error)
    throw error
  }
}

export async function deleteConversation(conversationId: string) {
  try {
    // Delete all messages in this conversation
    const messages = await databases.listDocuments(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.messages,
      [Query.equal('conversationId', conversationId)]
    )
    
    for (const message of messages.documents) {
      await databases.deleteDocument(
        clientConfig.appwrite.databaseId,
        clientConfig.appwrite.collections.messages,
        message.$id
      )
    }
    
    // Delete the conversation
    await databases.deleteDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.conversations,
      conversationId
    )
  } catch (error) {
    console.error('Delete conversation error:', error)
    throw error
  }
}

// Message functions
export async function addMessage(data: Omit<Message, '$id' | 'createdAt'>) {
  try {
    const message = await databases.createDocument(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.messages,
      ID.unique(),
      {
        ...data,
        createdAt: new Date().toISOString(),
      }
    )
    
    // Update conversation metadata
    const conversation = await getConversation(data.conversationId)
    const currentCount = parseInt(conversation.messageCount || '0')
    await updateConversation(data.conversationId, {
      lastMessage: data.content.substring(0, 100),
      messageCount: (currentCount + 1).toString(),
    })
    
    return message
  } catch (error) {
    console.error('Add message error:', error)
    throw error
  }
}

export async function getMessages(conversationId: string, limit = 50) {
  try {
    const response = await databases.listDocuments(
      clientConfig.appwrite.databaseId,
      clientConfig.appwrite.collections.messages,
      [
        Query.equal('conversationId', conversationId),
        Query.orderAsc('createdAt'),
        Query.limit(limit)
      ]
    )
    
    return response.documents
  } catch (error) {
    console.error('Get messages error:', error)
    throw error
  }
}

// Realtime subscriptions (simplified - can be enhanced with proper Appwrite realtime later)
export function subscribeToConversation(
  conversationId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _onMessage: (message: Message) => void
) {
  // Placeholder for realtime functionality
  // In a production app, you would implement proper Appwrite realtime subscriptions
  console.log('Realtime subscription for conversation:', conversationId)
  return () => {} // Return unsubscribe function
}

export function subscribeToUserChatbots(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _onUpdate: (chatbot: Chatbot) => void
) {
  // Placeholder for realtime functionality
  console.log('Realtime subscription for user chatbots:', userId)
  return () => {} // Return unsubscribe function
}

// Check if Appwrite is available
export function isAppwriteAvailable(): boolean {
  return clientConfig.features.enableAppwrite
} 