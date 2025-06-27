"use client"

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { clientConfig as config } from "@/config/tavily.config"
import { 
  Send, 
  Globe, 
  Copy, 
  Check, 
  FileText, 
  Database, 
  ArrowLeft, 
  ExternalLink, 
  BookOpen,
  Loader2,
  AlertCircle,
  Search,
  User,
  Bot,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"

interface Source {
  id: string
  url: string
  title: string
  snippet: string
  score: number
  index: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp: Date
}

// Simple markdown renderer component
function MarkdownContent({ content, onSourceClick, isStreaming = false }: { 
  content: string
  onSourceClick?: (index: number) => void
  isStreaming?: boolean 
}) {
  const parseMarkdown = (text: string) => {
    // Handle code blocks
    const codeBlocks: string[] = []
    let parsed = text.replace(/```([\s\S]*?)```/g, (_, code) => {
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`
      codeBlocks.push(`<pre class="bg-gray-50 border border-gray-200 p-4 rounded-lg overflow-x-auto my-4 text-sm"><code>${code.trim()}</code></pre>`)
      return placeholder
    })
    
    // Handle inline code
    parsed = parsed.replace(/`([^`]+)`/g, '<code class="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    
    // Handle links
    parsed = parsed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-orange-600 hover:text-orange-700 underline">$1</a>')
    
    // Handle citations
    parsed = parsed.replace(/\[(\d+)\]/g, (_, num) => {
      return `<sup class="citation text-orange-600 cursor-pointer hover:text-orange-700 font-medium" data-citation="${num}">[${num}]</sup>`
    })
    
    // Handle bold and italic
    parsed = parsed.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    parsed = parsed.replace(/\*(.+?)\*/g, '<em>$1</em>')
    
    // Handle headers and lists
    const lines = parsed.split('\n')
    const processedLines = []
    let inList = false
    let inParagraph = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.match(/^#{1,3}\s/)) {
        if (inParagraph) {
          processedLines.push('</p>')
          inParagraph = false
        }
        if (line.match(/^###\s(.+)$/)) {
          processedLines.push(line.replace(/^###\s(.+)$/, '<h3 class="text-base font-semibold mt-4 mb-2 text-gray-900">$1</h3>'))
        } else if (line.match(/^##\s(.+)$/)) {
          processedLines.push(line.replace(/^##\s(.+)$/, '<h2 class="text-lg font-semibold mt-5 mb-3 text-gray-900">$1</h2>'))
        } else if (line.match(/^#\s(.+)$/)) {
          processedLines.push(line.replace(/^#\s(.+)$/, '<h1 class="text-xl font-bold mt-6 mb-3 text-gray-900">$1</h1>'))
        }
        continue
      }
      
      if (line.match(/^[-*]\s(.+)$/) || line.match(/^(\d+)\.\s(.+)$/)) {
        if (inParagraph) {
          processedLines.push('</p>')
          inParagraph = false
        }
        if (!inList) {
          const listType = line.match(/^[-*]\s/) ? 'ul' : 'ol'
          processedLines.push(`<${listType} class="${listType === 'ul' ? 'list-disc' : 'list-decimal'} ml-6 my-3 space-y-1">`)
          inList = true
        }
        const content = line.replace(/^[-*]\s(.+)$/, '$1').replace(/^(\d+)\.\s(.+)$/, '$2')
        processedLines.push(`<li class="text-gray-700 leading-relaxed">${content}</li>`)
        continue
      } else if (inList && line === '') {
        processedLines.push(inList ? '</ul>' : '</ol>')
        inList = false
        continue
      }
      
      if (line === '') {
        if (inParagraph) {
          processedLines.push('</p>')
          inParagraph = false
        }
        continue
      }
      
      if (!inParagraph && !inList && !line.startsWith('<')) {
        processedLines.push('<p class="text-gray-700 leading-relaxed mb-3">')
        inParagraph = true
      }
      
      if (inParagraph) {
        processedLines.push(line + ' ')
      } else {
        processedLines.push(line)
      }
    }
    
    if (inParagraph) processedLines.push('</p>')
    if (inList) processedLines.push(inList ? '</ul>' : '</ol>')
    
    parsed = processedLines.join('\n')
    
    // Restore code blocks
    codeBlocks.forEach((block, index) => {
      parsed = parsed.replace(`__CODE_BLOCK_${index}__`, block)
    })
    
    return parsed
  }

  useEffect(() => {
    const citations = document.querySelectorAll('.citation')
    citations.forEach(citation => {
      citation.addEventListener('click', (e) => {
        const citationNum = parseInt((e.target as HTMLElement).getAttribute('data-citation') || '0')
        if (onSourceClick && citationNum > 0) {
          onSourceClick(citationNum - 1)
        }
      })
    })

    return () => {
      citations.forEach(citation => {
        citation.removeEventListener('click', () => {})
      })
    }
  }, [content, onSourceClick])

  return (
    <div className="relative">
      <div 
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
      />
      {isStreaming && (
        <span className="inline-block w-1 h-4 bg-gray-600 animate-pulse ml-1" />
      )}
    </div>
  )
}

function ChatContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  
  const namespace = searchParams.get('namespace')
  const [chatbot, setChatbot] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    const loadChatbot = async () => {
      if (!namespace) {
        setError('No chatbot specified')
        return
      }

      try {
        // Fetch chatbot from database by namespace
        const response = await fetch(`/api/chatbots`)
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            const dbChatbot = result.data.find((bot: any) => bot.namespace === namespace)
            if (dbChatbot) {
              setChatbot(dbChatbot)
              setError(null)
              return
            }
          }
        }
        
        // If not found in database
        setError('Chatbot not found. It may have been deleted or you may not have access to it.')
        
      } catch (error) {
        console.error('Failed to fetch chatbot from database:', error)
        setError('Failed to load chatbot. Please try again.')
      }
    }
    
    loadChatbot()
  }, [namespace])

  useEffect(() => {
    const el = scrollAreaRef.current
    if (!el) return
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const atBottom = scrollHeight - scrollTop - clientHeight < 20
      setAutoScroll(atBottom)
    }
    
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages, autoScroll])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !namespace) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setSources([])
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          namespace,
          useWebSearch: false,
          maxResults: 5
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Check for sources in headers
      const sourcesHeader = response.headers.get('X-Sources')
      if (sourcesHeader) {
        try {
          const parsedSources = JSON.parse(sourcesHeader)
          setSources(parsedSources)
        } catch {
          // Ignore parsing errors
        }
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let assistantMessage = ''
      const decoder = new TextDecoder()

      // Add assistant message placeholder
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content) {
                assistantMessage += data.content
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1].content = assistantMessage
                  return newMessages
                })
              }
            } catch {
              // Handle non-JSON lines
              assistantMessage += line.slice(6)
              setMessages(prev => {
                const newMessages = [...prev]
                newMessages[newMessages.length - 1].content = assistantMessage
                return newMessages
              })
            }
          }
        }
      }

      // Add sources to the final message
      if (sources.length > 0) {
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1].sources = sources
          return newMessages
        })
      }

    } catch (error) {
      console.error('Chat error:', error)
      setError(error instanceof Error ? error.message : 'Failed to send message')
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItem(itemId)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedItem(null), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleSourceClick = (index: number) => {
    if (sources[index]) {
      window.open(sources[index].url, '_blank')
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading chatbot...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-orange-100 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                {chatbot.favicon && (
                  <img 
                    src={chatbot.favicon} 
                    alt="Favicon" 
                    className="w-6 h-6 rounded-sm"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                )}
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {chatbot.name || new URL(chatbot.url).hostname}
                  </h1>
                  <p className="text-sm text-gray-500 flex items-center">
                    <Globe className="w-3 h-3 mr-1" />
                    {new URL(chatbot.url).hostname}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <Database className="w-3 h-3 mr-1" />
                {chatbot.pagesCrawled} results
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(chatbot.url, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit Site
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex max-w-6xl mx-auto w-full">
        {/* Main Chat */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div 
            ref={scrollAreaRef}
            className="flex-1 overflow-y-auto p-4 space-y-6"
          >
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Start a conversation
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Ask me anything about {chatbot.name || new URL(chatbot.url).hostname}. 
                  I can help you find information from the website content.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInput("What is this website about?")}
                    className="text-sm"
                  >
                    What is this website about?
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInput("What services or products are offered?")}
                    className="text-sm"
                  >
                    What services are offered?
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInput("How can I get started?")}
                    className="text-sm"
                  >
                    How can I get started?
                  </Button>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white ml-auto'
                        : 'bg-white/80 backdrop-blur-sm border border-orange-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user' 
                          ? 'bg-white/20' 
                          : 'bg-orange-100'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4 text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {message.role === 'user' ? (
                          <p className="text-white">{message.content}</p>
                        ) : (
                          <MarkdownContent 
                            content={message.content}
                            onSourceClick={handleSourceClick}
                            isStreaming={isLoading && index === messages.length - 1}
                          />
                        )}
                        
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-2">Sources:</p>
                            <div className="space-y-2">
                              {message.sources.slice(0, 3).map((source, sourceIndex) => (
                                <div
                                  key={source.id}
                                  className="flex items-center justify-between text-xs bg-gray-50 rounded-lg p-2"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">
                                      [{source.index}] {source.title}
                                    </p>
                                    <p className="text-gray-600 truncate">{source.url}</p>
                                  </div>
                                  <div className="flex items-center space-x-1 ml-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => window.open(source.url, '_blank')}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => copyToClipboard(source.url, `source-${source.id}`)}
                                    >
                                      {copiedItem === `source-${source.id}` ? (
                                        <Check className="w-3 h-3 text-green-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="border-t border-orange-100 bg-white/50 backdrop-blur-sm p-4">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
              <div className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything about this website..."
                  disabled={isLoading}
                  className="flex-1 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  )
} 