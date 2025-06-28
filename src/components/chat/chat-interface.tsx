"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Send, Bot, User, Loader2, AlertCircle } from 'lucide-react'
import { Source, SourceCitation } from './source-citation'
import { MarkdownRenderer } from './markdown-renderer'
import { toast } from 'sonner'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp: Date
  isCompanySpecific?: boolean
}

interface ChatInterfaceProps {
  chatbotId?: string
  namespace?: string
  useWebSearch?: boolean
  maxResults?: number
}

export function ChatInterface({ chatbotId, namespace, useWebSearch = false, maxResults = 5 }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load chat history when component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!chatbotId) return

      try {
        const response = await fetch(`/api/chat/history?chatbotId=${chatbotId}&limit=50`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data.messages.length > 0) {
            const historyMessages: Message[] = result.data.messages.map((msg: {
              $id?: string;
              role: 'user' | 'assistant';
              content: string;
              sources?: Source[];
              timestamp: string;
              isCompanySpecific?: boolean;
            }) => ({
              id: msg.$id || Date.now().toString(),
              role: msg.role,
              content: msg.content,
              sources: msg.sources || [],
              timestamp: new Date(msg.timestamp),
              isCompanySpecific: msg.isCompanySpecific
            }))
            setMessages(historyMessages)
          }
        }
      } catch (error) {
        console.error('Failed to load chat history:', error)
      }
    }

    loadChatHistory()
  }, [chatbotId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          chatbotId,
          namespace,
          useWebSearch,
          maxResults
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        sources: [],
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            
            if (data === '[DONE]') {
              setIsLoading(false)
              return
            }

            try {
              const parsed = JSON.parse(data)
              
              switch (parsed.type) {
                case 'status':
                  // Handle status updates
                  break
                  
                case 'sources':
                  assistantMessage.sources = parsed.data
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === assistantMessage.id 
                        ? { ...m, sources: parsed.data }
                        : m
                    )
                  )
                  break
                  
                case 'content':
                  assistantMessage.content = parsed.data
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === assistantMessage.id 
                        ? { ...m, content: parsed.data }
                        : m
                    )
                  )
                  break
                  
                case 'complete':
                  const { response, sources, isCompanySpecific } = parsed.data
                  assistantMessage.content = response
                  assistantMessage.sources = sources
                  assistantMessage.isCompanySpecific = isCompanySpecific
                  
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === assistantMessage.id 
                        ? { ...assistantMessage }
                        : m
                    )
                  )
                  setIsLoading(false)
                  break

                case 'error':
                  setError(parsed.data)
                  setIsLoading(false)
                  break
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error)
            }
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
      
      // Remove the assistant message if there was an error
      setMessages(prev => prev.filter(m => m.id !== (Date.now() + 1).toString()))
      
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

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

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
            )}
            
            <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
              <Card className={`${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground ml-auto' 
                  : 'bg-card'
              } border-0 shadow-sm rounded-2xl`}>
                <CardContent className="p-4">
                  {message.role === 'user' ? (
                    <p className="text-sm">{message.content}</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <MarkdownRenderer content={message.content} />
                      </div>
                      
                      {message.sources && message.sources.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-xs text-muted-foreground mb-2">Sources:</p>
                          <div className="flex flex-wrap gap-1">
                            {message.sources.slice(0, 3).map((source, idx) => (
                              <SourceCitation key={idx} source={source} index={idx} />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {message.isCompanySpecific && (
                        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          Company-specific response
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500 text-white flex-shrink-0">
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
                          <p className="text-sm opacity-80">{error}</p>
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