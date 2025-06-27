"use client"

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { ChatInterface } from '@/components/chat/chat-interface'

function PublicChatPageContent() {
  const params = useParams()
  const namespace = params.id as string

  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto h-full">
            <ChatInterface 
              namespace={namespace || undefined}
              useWebSearch={true}
              maxResults={5}
            />
        </div>
      </main>
    </div>
  )
}

export default function PublicChatPage() {
    return (
        <Suspense fallback={
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading chatbot...</p>
            </div>
          </div>
        }>
            <PublicChatPageContent />
        </Suspense>
    )
} 