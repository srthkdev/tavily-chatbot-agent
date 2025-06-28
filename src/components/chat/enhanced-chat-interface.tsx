'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Send, Bot, User, ExternalLink, Building, Globe, Clock, CheckCircle } from 'lucide-react'
import { MarkdownRenderer } from './markdown-renderer'
import { SourceCitation } from './source-citation'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp: Date
  isCompanySpecific?: boolean
}

interface Source {
  id: string
  title: string
  url: string
  snippet: string
  type: 'web' | 'memory' | 'rag'
  score?: number
}

interface ChatInterfaceProps {
  namespace?: string
  chatbotId?: string
  companyInfo?: {
    name: string
    domain: string
    description: string
    industry?: string
  }
  initialMessage?: string
  className?: string
}

export function EnhancedChatInterface({
  namespace,
  chatbotId,
  companyInfo,
  initialMessage,
  className = '',
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentSources, setCurrentSources] = useState<Source[]>([])
  const [status, setStatus] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (initialMessage && messages.length === 0) {
      handleSend(initialMessage)
    }
  }, [initialMessage])

  // Load chat history when component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!chatbotId) return

      try {
        const response = await fetch(`/api/chat/history?chatbotId=${chatbotId}&limit=50`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data.messages.length > 0) {
            const historyMessages: Message[] = result.data.messages.map((msg: any) => ({
              id: msg.$id || Date.now().toString(),
              role: msg.role,
              content: msg.content,
              sources: msg.sources || [],
              timestamp: new Date(msg.timestamp),
              isCompanySpecific: msg.isCompanySpecific,
            }))
            setMessages(historyMessages)
          }
        }
      } catch (error) {
        console.warn('Failed to load chat history:', error)
      }
    }

    loadChatHistory()
  }, [chatbotId])

  const handleSend = async (messageContent?: string) => {
    const content = messageContent || input.trim()
    if (!content || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setStatus('Processing your request...')
    setCurrentSources([])

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          namespace,
          chatbotId,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        sources: [],
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            
            if (data === '[DONE]') {
              setIsLoading(false)
              setStatus('')
              return
            }

            try {
              const parsed = JSON.parse(data)
              
              switch (parsed.type) {
                case 'status':
                  setStatus(parsed.data)
                  break
                  
                case 'sources':
                  setCurrentSources(parsed.data)
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
                  setCurrentSources(sources)
                  setIsLoading(false)
                  setStatus('')
                  break
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error)
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // Request was cancelled
      }
      
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
      setStatus('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      {companyInfo && (
        <div className="border-b bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15 border border-primary/20">
              <Building className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xl text-foreground">{companyInfo.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Globe className="w-3 h-3" />
                <span className="font-medium">{companyInfo.domain}</span>
                {companyInfo.industry && (
                  <>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs bg-primary/10 border-primary/20">
                      {companyInfo.industry}
                    </Badge>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Company Assistant
              </Badge>
            </div>
          </div>
          {companyInfo.description && (
            <div className="mt-3 p-3 bg-background/50 rounded-lg border border-primary/10">
              <p className="text-sm text-foreground/80 leading-relaxed">
                {companyInfo.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>
              {companyInfo 
                ? `Ask me anything about ${companyInfo.name}!`
                : 'Start a conversation...'
              }
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                  {message.isCompanySpecific && companyInfo ? (
                    <Building className="w-4 h-4 text-primary" />
                  ) : (
                    <Bot className="w-4 h-4 text-primary" />
                  )}
                </div>
              </div>
            )}

            <div
              className={`max-w-[80%] ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-lg px-4 py-2'
                  : 'space-y-2'
              }`}
            >
              {message.role === 'user' ? (
                <p className="text-sm">{message.content}</p>
              ) : (
                <Card>
                  <CardContent className="p-4">
                    {message.isCompanySpecific && companyInfo && (
                      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Responding as {companyInfo.name}</span>
                      </div>
                    )}
                    
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <MarkdownRenderer content={message.content} />
                    </div>

                    {message.sources && message.sources.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">
                            Sources
                          </h4>
                          <div className="grid gap-2">
                            {message.sources.map((source, index) => (
                              <SourceCitation
                                key={source.id}
                                source={source}
                                index={index + 1}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Clock className="w-3 h-3" />
                <span>{message.timestamp.toLocaleTimeString()}</span>
              </div>
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                  <User className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <Bot className="w-4 h-4 text-primary animate-pulse" />
              </div>
            </div>
            <Card className="max-w-[80%]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce delay-75" />
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce delay-150" />
                  <span className="ml-2">{status || 'Thinking...'}</span>
                </div>
                
                {currentSources.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Found Sources
                      </h4>
                      <div className="grid gap-2">
                        {currentSources.map((source, index) => (
                          <SourceCitation
                            key={source.id}
                            source={source}
                            index={index + 1}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              companyInfo 
                ? `Ask ${companyInfo.name} a question...`
                : 'Type your message...'
            }
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 