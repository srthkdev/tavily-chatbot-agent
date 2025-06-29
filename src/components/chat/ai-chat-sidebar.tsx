'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Send, 
  Bot, 
  User, 
  Loader2,
  Building2,
  
  ExternalLink,
  X,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  BarChart3,
  TrendingUp,
  Globe,
  GitCompare
} from 'lucide-react'
import { toast } from 'sonner'
import { MarkdownRenderer } from './markdown-renderer'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp: Date
}

interface Source {
  id: string
  title: string
  url: string
  snippet: string
  domain?: string
}

interface CompanyData {
  name: string
  url?: string
  industry?: string | null
  hqLocation?: string | null
  researchReport?: string | null
  companyInfo?: Record<string, unknown>
  generatedAt?: string
  references?: Array<{
    url: string
    title: string
    domain: string
    score?: number
  }>
}

interface AIChatSidebarProps {
  companyName: string
  chatbotId?: string
  namespace?: string
  companyData?: CompanyData
  isExpanded: boolean
  onToggleExpand: () => void
  onClose: () => void
}

const QUICK_ACTIONS = [
  {
    label: "Company Overview",
    prompt: "Give me a comprehensive overview of this company including its business model, key products/services, and market position.",
    icon: Building2
  },
  {
    label: "Financial Analysis", 
    prompt: "Provide a detailed financial analysis including revenue, profitability, funding history, and key financial metrics.",
    icon: BarChart3
  },
  {
    label: "Market Position",
    prompt: "Analyze the company's market position, competitive landscape, and industry trends.",
    icon: TrendingUp
  },
  {
    label: "Recent News",
    prompt: "What are the latest news and developments about this company?",
    icon: Globe
  },
  {
    label: "Compare Competitors",
    prompt: "Create a detailed comparison table of this company with its main competitors including market share, revenue, and key differentiators.",
    icon: GitCompare
  }
]

export function AIChatSidebar({ 
  companyName, 
  chatbotId, 
  namespace,
  companyData,
  isExpanded,
  onToggleExpand,
  onClose
}: AIChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm the **${companyName} AI Assistant**. I'm powered by GPT-4.1 and have access to:

🔍 **Real-time web search** via Tavily
🧠 **Company memory** via Mem0 
📊 **Knowledge base** via RAG
🤖 **LangGraph agents** for complex analysis

I can help you with:
- Company analysis and insights
- Financial performance and metrics
- Market positioning and trends
- Competitive comparisons with tables and charts
- Recent news and developments
- Strategic recommendations

What would you like to know about ${companyName}?`,
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleQuickAction = (prompt: string) => {
    setInput(prompt)
    handleSubmit(undefined, prompt)
  }

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleSubmit = async (e?: React.FormEvent, quickPrompt?: string) => {
    e?.preventDefault()
    const messageContent = quickPrompt || input.trim()
    if (!messageContent || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat/gpt4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          companyName,
          companyData,
          chatbotId,
          namespace
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      let assistantContent = ''
      let sources: Source[] = []

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        sources: [],
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            if (line === 'data: [DONE]') {
              break
            }
            
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'content') {
                assistantContent = data.content
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                )
              } else if (data.type === 'sources') {
                sources = data.sources
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, sources: sources }
                      : msg
                  )
                )
              }
            } catch (parseError) {
              console.warn('Error parsing streaming data:', parseError)
            }
          }
        }
      }

    } catch (chatError) {
      console.error('Chat error:', chatError)
      toast.error('Failed to send message. Please try again.')
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I apologize, but I'm having trouble responding right now. As the ${companyName} assistant, I'm here to help with questions about the company. Please try again.`,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-lg transition-all duration-300 z-20 ${
      isExpanded ? 'w-96' : 'w-80'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{companyName} AI</h3>
              <p className="text-xs text-white/80">Powered by GPT-4.1</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className="text-white hover:bg-white/20"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="p-4 border-b">
          <div className="text-sm text-gray-600 mb-3">Quick actions:</div>
          <div className="space-y-2">
            {QUICK_ACTIONS.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action.prompt)}
                className="w-full justify-start text-xs"
                disabled={isLoading}
              >
                <action.icon className="w-3 h-3 mr-2" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100vh - 200px)' }}>
        {messages.map((message) => (
          <div key={message.id} className="space-y-3">
            <div
              className={`flex items-start space-x-3 ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <Avatar className="w-6 h-6">
                <AvatarFallback className={
                  message.role === 'user' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-purple-100 text-purple-600'
                }>
                  {message.role === 'user' ? (
                    <User className="w-3 h-3" />
                  ) : (
                    <Bot className="w-3 h-3" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block p-2 rounded-lg max-w-full text-sm ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-50 text-gray-900'
                }`}>
                  {message.role === 'assistant' ? (
                    <MarkdownRenderer content={message.content} />
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                </div>

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs font-medium text-gray-600">Sources:</div>
                    <div className="space-y-1">
                      {message.sources.slice(0, 3).map((source) => (
                        <div key={source.id} className="bg-white border rounded p-2 text-xs">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 mb-1 text-xs">
                                {source.title}
                              </div>
                              <div className="text-gray-600 text-xs line-clamp-2">
                                {source.snippet}
                              </div>
                              {source.domain && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {source.domain}
                                </div>
                              )}
                            </div>
                            {source.url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(source.url, '_blank')}
                                className="ml-1 p-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Copy button and timestamp */}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    {formatTime(message.timestamp)}
                  </span>
                  {message.role === 'assistant' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(message.content, message.id)}
                      className="text-xs p-1"
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-3">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="bg-purple-100 text-purple-600">
                <Bot className="w-3 h-3" />
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg">
              <Loader2 className="w-3 h-3 animate-spin text-purple-500" />
              <span className="text-xs text-gray-600">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${companyName}...`}
            disabled={isLoading}
            className="flex-1 text-sm"
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
} 