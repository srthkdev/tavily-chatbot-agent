"use client"

import { useState, useRef, useEffect } from 'react'
import { useChat } from 'ai/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Send, Bot, User, Loader2, AlertCircle } from 'lucide-react'
import type { Message } from 'ai'
import { Source, SourceCitation } from './source-citation'
import { MarkdownRenderer } from './markdown-renderer'

interface ChatInterfaceProps {
  chatbotId?: string
  namespace?: string
  useWebSearch?: boolean
  maxResults?: number
}

export function ChatInterface({ chatbotId, namespace, useWebSearch = false, maxResults = 5 }: ChatInterfaceProps) {
  const [sourcesForMessages, setSourcesForMessages] = useState<Record<string, Source[]>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages } = useChat({
    api: '/api/chat',
    body: {
      namespace: namespace,
      useWebSearch: useWebSearch || !namespace, // Use web search if no namespace or explicitly enabled
      maxResults: maxResults,
    },
    onResponse: async (response) => {
      // Handle sources from response headers
      const sourcesHeader = response.headers.get('x-sources')
      const sourcesEncoding = response.headers.get('x-sources-encoding')
      
      if (sourcesHeader) {
        try {
          let sourcesData = sourcesHeader
          
          // Decode base64 if needed
          if (sourcesEncoding === 'base64') {
            sourcesData = atob(sourcesHeader)
          }
          
          const sources = JSON.parse(sourcesData)
          if (sources && sources.length > 0) {
            // Wait a bit for the message to be added to the messages array
            setTimeout(() => {
              setMessages(currentMessages => {
                const newMessages = [...currentMessages]
                const latestAssistantMessage = newMessages
                  .slice()
                  .reverse()
                  .find(m => m.role === 'assistant')
                
                if (latestAssistantMessage) {
                  setSourcesForMessages(prev => ({
                    ...prev,
                    [latestAssistantMessage.id]: sources,
                  }))
                }
                return newMessages
              })
            }, 100)
          }
        } catch (error) {
          console.error('Error parsing sources:', error)
        }
      }
    },
    onError: (error) => {
      console.error('Chat error:', error)
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Start a conversation
            </h3>
            <p className="text-muted-foreground">
              {namespace 
                ? "Ask me anything about the uploaded content! I can also search the web for additional information."
                : "Ask me anything! I can search the web for current information."
              }
            </p>
          </div>
        )}

        {messages.map((message: Message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary flex-shrink-0">
                    <Bot className="w-5 h-5" />
                </div>
            )}
            <div className={`flex-1 space-y-3 max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
              <Card className={`border-0 shadow-sm rounded-2xl ${
                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card'
              }`}>
                <CardContent className="p-4">
                   <MarkdownRenderer content={message.content} />
                </CardContent>
              </Card>

              {message.role === 'assistant' && sourcesForMessages[message.id] && sourcesForMessages[message.id].length > 0 && (
                <SourceCitation sources={sourcesForMessages[message.id]} />
              )}
            </div>
             {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground flex-shrink-0">
                    <User className="w-5 h-5" />
                </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
           <div className="flex gap-4 justify-start">
             <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary flex-shrink-0">
                 <Bot className="w-5 h-5" />
             </div>
             <div className="flex-1 space-y-3">
               <Card className="border-0 shadow-sm bg-card rounded-2xl">
                 <CardContent className="p-4 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">
                      {namespace ? 'Searching knowledge base and web...' : 'Searching web...'}
                    </span>
                 </CardContent>
               </Card>
             </div>
           </div>
        )}
        
        {error && (
            <div className="flex justify-center">
                <Card className="bg-destructive/10 border-destructive text-destructive-foreground">
                    <CardContent className="p-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <div>
                          <p className="font-medium">Something went wrong</p>
                          <p className="text-sm opacity-80">{error.message}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-card/80 backdrop-blur-sm border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={namespace 
              ? "Ask about your content or anything else..." 
              : "Ask me anything..."
            }
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} variant="default">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
} 