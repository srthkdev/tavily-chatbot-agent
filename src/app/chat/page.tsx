"use client"

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Globe, Database } from "lucide-react"
import { AIChatInterface } from '@/components/chat/ai-chat-interface'

function ChatPageContent() {
  const searchParams = useSearchParams()
  const namespace = searchParams.get('namespace')
  const chatbotName = searchParams.get('name') || 'Chatbot'
  // Note: These parameters are available for future use
  // const useWebSearch = searchParams.get('webSearch') === 'true'
  // const maxResults = parseInt(searchParams.get('maxResults') || '5')

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="bg-card border-b p-3">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-md font-semibold truncate text-foreground">{chatbotName}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {namespace && (
                <div className="flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  <span>Knowledge Base</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span>Web Search</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto h-full">
            <AIChatInterface 
              companyName={chatbotName}
              namespace={namespace || undefined}
              chatbotId={namespace || undefined}
            />
        </div>
      </main>
    </div>
  )
}

export default function ChatPage() {
    return (
        <Suspense fallback={
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading chat...</p>
            </div>
          </div>
        }>
            <ChatPageContent />
        </Suspense>
    )
} 