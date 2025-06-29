'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  Bot, 
  User, 
  Loader2,
  Building2,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  BarChart3,
  TrendingUp,
  Globe,
  GitCompare,
  RefreshCw,
  Brain,
  Database,
  Search
} from 'lucide-react'
import { toast } from 'sonner'
import { MarkdownRenderer } from './markdown-renderer'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp: Date
  capabilities?: string[]
}

interface Source {
  id: string
  title: string
  url: string
  snippet: string
  domain?: string
  type?: 'tavily' | 'mem0' | 'rag'
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

interface AIChatInterfaceProps {
  companyName: string
  chatbotId?: string
  namespace?: string
  companyData?: CompanyData
}

const QUICK_ACTIONS = [
  {
    label: "Company Overview",
    prompt: "Give me a comprehensive overview of this company including its business model, key products/services, and market position.",
    icon: Building2,
    category: "Analysis"
  },
  {
    label: "Financial Analysis", 
    prompt: "Provide a detailed financial analysis including revenue, profitability, funding history, and key financial metrics.",
    icon: BarChart3,
    category: "Financial"
  },
  {
    label: "Market Position",
    prompt: "Analyze the company's market position, competitive landscape, and industry trends.",
    icon: TrendingUp,
    category: "Market"
  },
  {
    label: "Recent News",
    prompt: "What are the latest news and developments about this company?",
    icon: Globe,
    category: "News"
  },
  {
    label: "Compare Competitors",
    prompt: "Create a detailed comparison table of this company with its main competitors including market share, revenue, and key differentiators.",
    icon: GitCompare,
    category: "Comparison"
  }
]

export function AIChatInterface({ 
  companyName, 
  chatbotId, 
  namespace,
  companyData
}: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [activeCapabilities, setActiveCapabilities] = useState({
    tavily: true,
    mem0: true,
    rag: true,
    langgraph: true
  })
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load chat history from database on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!chatbotId) return
      
      try {
        const response = await fetch(`/api/chat/history/${chatbotId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.messages) {
            setMessages(data.messages.map((msg: { id: string; role: 'user' | 'assistant'; content: string; sources?: Source[]; timestamp: string; capabilities?: string[] }) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            })))
          }
        }
      } catch (error) {
        console.warn('Failed to load chat history:', error)
      }
      
      // Add welcome message if no history
      if (messages.length === 0) {
        setMessages([{
          id: '1',
          role: 'assistant',
          content: `Hi! I'm the **${companyName} AI Assistant**. I'm powered by GPT-4.1 and have access to:

🔍 **Real-time web search** via Tavily API
🧠 **Company memory** via Mem0 
📊 **Knowledge base** via RAG (${namespace ? 'Active' : 'Inactive'})
🤖 **LangGraph agents** for complex analysis

I can help you with:
- Company analysis and insights
- Financial performance and metrics
- Market positioning and trends
- Competitive comparisons with tables and charts
- Recent news and developments
- Strategic recommendations

What would you like to know about ${companyName}?`,
          timestamp: new Date(),
          capabilities: ['Real-time search', 'Memory', 'RAG', 'Complex reasoning']
        }])
      }
    }
    
    loadChatHistory()
  }, [chatbotId, companyName, namespace])

  // Save chat messages to database
  const saveChatMessage = async (message: Message) => {
    if (!chatbotId) return
    
    try {
      await fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbotId,
          message: {
            id: message.id,
            role: message.role,
            content: message.content,
            sources: message.sources || [],
            capabilities: message.capabilities || [],
            timestamp: message.timestamp.toISOString()
          }
        })
      })
    } catch (error) {
      console.warn('Failed to save chat message:', error)
    }
  }

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
    await saveChatMessage(userMessage)
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
          namespace,
          capabilities: activeCapabilities
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
      let capabilities: string[] = []

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        sources: [],
        capabilities: [],
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
              } else if (data.type === 'capabilities') {
                capabilities = data.capabilities
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, capabilities: capabilities }
                      : msg
                  )
                )
              }
            } catch (error) {
              console.warn('Error parsing streaming data:', error)
            }
          }
        }
      }

      // Save final assistant message
      const finalMessage = {
        ...assistantMessage,
        content: assistantContent,
        sources,
        capabilities
      }
      await saveChatMessage(finalMessage)

    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to send message. Please try again.')
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I apologize, but I'm having trouble responding right now. As the ${companyName} assistant, I'm here to help with questions about the company. Please try again.`,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
      await saveChatMessage(errorMessage)
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

  const toggleCapability = (capability: keyof typeof activeCapabilities) => {
    setActiveCapabilities(prev => ({
      ...prev,
      [capability]: !prev[capability]
    }))
  }

  return (
    <div className="h-[800px] flex flex-col"> {/* Fixed height container - increased from 600px to 800px */}
      {/* Header */}
      <Card className="mb-4 flex-shrink-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">{companyName} AI Assistant</CardTitle>
                <p className="text-sm text-gray-600">Powered by GPT-4.1 with real-time capabilities</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Live Data
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Capability Controls */}
      <Card className="mb-4 flex-shrink-0">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Active Capabilities:</span>
            <div className="flex space-x-2">
              <Button
                variant={activeCapabilities.tavily ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCapability('tavily')}
                className="text-xs"
              >
                <Search className="w-3 h-3 mr-1" />
                Tavily
              </Button>
              <Button
                variant={activeCapabilities.mem0 ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCapability('mem0')}
                className="text-xs"
              >
                <Brain className="w-3 h-3 mr-1" />
                Mem0
              </Button>
              <Button
                variant={activeCapabilities.rag ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCapability('rag')}
                className="text-xs"
              >
                <Database className="w-3 h-3 mr-1" />
                RAG
              </Button>
              <Button
                variant={activeCapabilities.langgraph ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCapability('langgraph')}
                className="text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                LangGraph
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <Card className="mb-4 flex-shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {QUICK_ACTIONS.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.prompt)}
                  className="justify-start text-xs h-auto py-2"
                  disabled={isLoading}
                >
                  <action.icon className="w-3 h-3 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">{action.label}</div>
                    <div className="text-xs text-gray-500">{action.category}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages - Scrollable Area */}
      <Card className="flex-1 flex flex-col min-h-0"> {/* min-h-0 allows flex child to shrink */}
        <CardContent className="flex-1 p-4 overflow-hidden">
          <div 
            ref={scrollAreaRef} 
            className="h-full overflow-y-auto space-y-4 pr-2" // Added padding-right for scrollbar
            style={{ scrollBehavior: 'smooth' }}
          >
            {messages.map((message) => (
              <div key={message.id} className="space-y-3">
                <div
                  className={`flex items-start space-x-3 ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className={
                      message.role === 'user' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-purple-100 text-purple-600'
                    }>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div className={`flex-1 min-w-0 ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block p-3 rounded-lg max-w-full break-words ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-50 text-gray-900'
                    }`}>
                      {message.role === 'assistant' ? (
                        <MarkdownRenderer content={message.content} />
                      ) : (
                        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                      )}
                    </div>

                    {/* Message Actions */}
                    {message.role === 'assistant' && message.content && (
                      <div className="mt-2 flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(message.content, message.id)}
                          className="text-xs"
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                        <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                      </div>
                    )}

                    {/* Capabilities Used */}
                    {message.capabilities && message.capabilities.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {message.capabilities.map((capability, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {capability}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs font-medium text-gray-600">Sources:</div>
                        <div className="space-y-2">
                          {message.sources.slice(0, 3).map((source) => (
                            <div key={source.id} className="bg-white border rounded p-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 mb-1 text-xs truncate">
                                    {source.title}
                                  </div>
                                  <div className="text-gray-600 text-xs line-clamp-2">
                                    {source.snippet}
                                  </div>
                                  <div className="flex items-center space-x-2 mt-1">
                                    {source.domain && (
                                      <span className="text-xs text-gray-500 truncate">
                                        {source.domain}
                                      </span>
                                    )}
                                    {source.type && (
                                      <Badge variant="outline" className="text-xs">
                                        {source.type}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {source.url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(source.url, '_blank')}
                                    className="ml-2 p-1 flex-shrink-0"
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
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Input Area */}
      <Card className="mt-4 flex-shrink-0">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${companyName} AI Assistant anything...`}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 