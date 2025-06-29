"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AIChatInterface } from '@/components/chat/ai-chat-interface'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertCircle, Globe, Building } from 'lucide-react'

interface PublicChatbot {
  id: string
  namespace: string
  title: string
  description: string
  companyName: string
  domain: string
  industry: string
  published: boolean
  createdAt: string
}

export default function PublicChatbotPage() {
  const params = useParams()
  const chatbotId = params.id as string
  
  const [chatbot, setChatbot] = useState<PublicChatbot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (chatbotId) {
      const fetchPublicChatbot = async () => {
        try {
          setLoading(true)
          const response = await fetch(`/api/public/chatbots/${chatbotId}`)
          
          if (response.ok) {
            const result = await response.json()
            if (result.success) {
              setChatbot(result.data)
            } else {
              setError(result.error || 'Chatbot not found')
            }
          } else if (response.status === 404) {
            setError('This chatbot is not publicly available or does not exist.')
          } else {
            setError('Failed to load chatbot. Please try again later.')
          }
        } catch (e) {
          console.error('Fetch error:', e)
          setError('An unexpected error occurred while loading the chatbot.')
        } finally {
          setLoading(false)
        }
      }
      
      fetchPublicChatbot()
    }
  }, [chatbotId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading chatbot...</p>
        </div>
      </div>
    )
  }

  if (error || !chatbot) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Chatbot Not Available</h2>
            <p className="text-muted-foreground mb-4">
              {error || 'This chatbot is not publicly available or does not exist.'}
            </p>
            <div className="text-sm text-muted-foreground">
              <p>Possible reasons:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The chatbot has not been published</li>
                <li>The chatbot ID is incorrect</li>
                <li>The chatbot has been removed</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with company branding */}
      <header className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground">
                {chatbot.title}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="w-3 h-3" />
                <span>{chatbot.domain}</span>
                {chatbot.industry && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{chatbot.industry}</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Powered by</div>
              <div className="text-sm font-medium">Tavily AI</div>
            </div>
          </div>
          
          {chatbot.description && (
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
              {chatbot.description}
            </p>
          )}
        </div>
      </header>

      {/* Chat Interface */}
      <main className="max-w-4xl mx-auto px-4 py-6">
                 <AIChatInterface
           companyName={chatbot.companyName}
           chatbotId={chatbot.namespace}
           namespace={chatbot.namespace}
           companyData={{
             name: chatbot.companyName,
             url: chatbot.domain,
             industry: chatbot.industry,
             researchReport: chatbot.description
           }}
         />
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>© {new Date().getFullYear()} {chatbot.companyName}</span>
              <a 
                href={`https://${chatbot.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Visit Website
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span>Powered by</span>
              <a 
                href="https://tavily.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-medium hover:text-primary transition-colors"
              >
                Tavily AI
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
} 