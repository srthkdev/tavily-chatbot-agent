"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Search, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  Trash2,
  ExternalLink,
  Bot,
  Globe,
  Calendar,
  Users,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { CreateChatbotDialog } from '@/components/dashboard/create-chatbot-dialog'

interface ChatbotStats {
  id: string
  name: string
  description: string
  url: string
  conversations: number
  lastUsed: Date
  status: 'active' | 'inactive'
  provider: 'openai' | 'anthropic' | 'gemini' | 'groq'
}

export default function DashboardPage() {
  const [chatbots, setChatbots] = useState<ChatbotStats[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Load user's chatbots from API
  useEffect(() => {
    const loadChatbots = async () => {
      try {
        const response = await fetch('/api/chatbots')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setChatbots(result.data.map((bot: any) => ({
              id: bot.$id,
              name: bot.name,
              description: bot.description,
              url: bot.url,
              conversations: 0, // TODO: Get from conversations API
              lastUsed: new Date(bot.updatedAt),
              status: bot.status,
              provider: 'openai' // TODO: Get from bot config
            })))
          }
        } else if (response.status === 401) {
          // User not authenticated, show empty state
          setChatbots([])
        }
      } catch (error) {
        console.error('Failed to load chatbots:', error)
        // Show mock data as fallback
        const mockChatbots: ChatbotStats[] = [
          {
            id: '1',
            name: 'Tech News Assistant',
            description: 'Stays up-to-date with the latest technology news and trends',
            url: 'https://techcrunch.com',
            conversations: 142,
            lastUsed: new Date('2024-01-20'),
            status: 'active',
            provider: 'openai'
          }
        ]
        setChatbots(mockChatbots)
      } finally {
        setIsLoading(false)
      }
    }

    loadChatbots()
  }, [])

  const filteredChatbots = chatbots.filter(bot =>
    bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bot.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalConversations = chatbots.reduce((sum, bot) => sum + bot.conversations, 0)
  const activeBots = chatbots.filter(bot => bot.status === 'active').length

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai': return 'bg-green-500'
      case 'anthropic': return 'bg-orange-500'
      case 'gemini': return 'bg-blue-500'
      case 'groq': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'openai': return 'OpenAI'
      case 'anthropic': return 'Anthropic'
      case 'gemini': return 'Gemini'
      case 'groq': return 'Groq'
      default: return provider
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold">Tavily Chatbot Dashboard</h1>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link href="/chat">
                <Button variant="outline" size="sm">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
              </Link>
              <CreateChatbotDialog 
                onChatbotCreated={(newBot: any) => {
                  // Add new chatbot to the list
                  setChatbots(prev => [{
                    id: newBot.id || newBot.$id,
                    name: newBot.name,
                    description: newBot.description,
                    url: newBot.url,
                    conversations: 0,
                    lastUsed: new Date(newBot.createdAt || new Date()),
                    status: newBot.status,
                    provider: 'openai'
                  }, ...prev])
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="chatbots" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="chatbots">Chatbots</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="chatbots" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Chatbots</CardTitle>
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{chatbots.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {activeBots} active
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalConversations.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Across all chatbots
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Providers</CardTitle>
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4</div>
                  <p className="text-xs text-muted-foreground">
                    OpenAI, Anthropic, Gemini, Groq
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search chatbots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Chatbots Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredChatbots.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    {searchQuery ? 'No chatbots found' : 'No chatbots yet'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery 
                      ? 'Try adjusting your search terms'
                      : 'Create your first chatbot to get started'
                    }
                  </p>
                  {!searchQuery && (
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Chatbot
                    </Button>
                  )}
                </div>
              ) : (
                filteredChatbots.map((chatbot) => (
                  <Card key={chatbot.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{chatbot.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {chatbot.description}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={chatbot.status === 'active' ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {chatbot.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Source:</span>
                          <a 
                            href={chatbot.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-600 hover:text-blue-800"
                          >
                            {new URL(chatbot.url).hostname}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Provider:</span>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getProviderColor(chatbot.provider)}`}></div>
                            {getProviderName(chatbot.provider)}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Conversations:</span>
                          <span className="font-medium">{chatbot.conversations}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Last used:</span>
                          <span>{chatbot.lastUsed.toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                        <Link href={`/chat?bot=${chatbot.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Chat
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Daily Conversations</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">47</div>
                  <p className="text-xs text-muted-foreground">
                    +12% from yesterday
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">23</div>
                  <p className="text-xs text-muted-foreground">
                    +3 new this week
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1.2s</div>
                  <p className="text-xs text-muted-foreground">
                    -0.3s improvement
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Search Queries</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-xs text-muted-foreground">
                    Web searches today
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Usage Analytics</CardTitle>
                <CardDescription>
                  Detailed analytics coming soon. Track conversations, user engagement, and performance metrics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4" />
                  <p>Analytics dashboard in development</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>
                  Manage your AI providers, search settings, and memory preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-4" />
                  <p>Settings panel coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 