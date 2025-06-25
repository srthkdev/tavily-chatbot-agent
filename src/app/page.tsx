"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Zap, Brain, Database, MessageSquare, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleQuickSearch = async () => {
    if (!searchQuery.trim()) return
    
    setIsLoading(true)
    // Navigate to chat with the search query
    window.location.href = `/chat?q=${encodeURIComponent(searchQuery)}`
  }

  const features = [
    {
      icon: Search,
      title: 'Tavily Search',
      description: 'Real-time web search optimized for AI agents with accurate, factual results',
      color: 'bg-blue-500'
    },
    {
      icon: Brain,
      title: 'Mem0 Memory',
      description: 'Persistent conversation memory that learns and adapts to your preferences',
      color: 'bg-purple-500'
    },
    {
      icon: Zap,
      title: 'Multi-AI Support',
      description: 'Choose from OpenAI, Anthropic, Gemini, and Grok with intelligent fallbacks',
      color: 'bg-green-500'
    },
    {
      icon: Database,
      title: 'Appwrite Backend',
      description: 'Secure authentication, real-time sync, and cloud storage integration',
      color: 'bg-orange-500'
    }
  ]

  const examples = [
    "What are the latest developments in quantum computing?",
    "Compare the best electric vehicles in 2025",
    "Explain the impact of AI on healthcare",
    "What is the current situation in renewable energy?",
    "How does cryptocurrency regulation work globally?"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">Tavily Chatbot</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/chat">
              <Button variant="outline" size="sm">
                <MessageSquare className="w-4 h-4 mr-2" />
                Start Chat
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            AI-Powered Search &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Conversation
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Get real-time answers from the web with personalized memory. 
            Powered by Tavily search, Mem0 memory, and multiple AI providers.
          </p>

          {/* Quick Search */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Ask anything... (e.g., &quot;What&apos;s happening in AI today?&quot;)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleQuickSearch()}
                className="text-lg py-6"
              />
              <Button 
                onClick={handleQuickSearch}
                disabled={isLoading || !searchQuery.trim()}
                className="px-8 py-6"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Example Queries */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {examples.map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery(example)}
                className="text-sm"
              >
                {example}
              </Button>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Technology Stack */}
        <Tabs defaultValue="ai" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ai">AI Providers</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="backend">Backend</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ai" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Multiple AI Providers</CardTitle>
                <CardDescription>
                  Intelligent fallback system across leading AI providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">OpenAI GPT-4o</Badge>
                  <Badge variant="secondary">Anthropic Claude 3.5</Badge>
                  <Badge variant="secondary">Google Gemini 2.0</Badge>
                  <Badge variant="secondary">Grok Beta</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  The system automatically selects the best available AI provider based on your configuration,
                  ensuring reliable responses even if one service is unavailable.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="search" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Tavily Search Engine</CardTitle>
                <CardDescription>
                  Purpose-built search for AI agents and LLMs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Real-time Results</Badge>
                  <Badge variant="secondary">AI-Optimized</Badge>
                  <Badge variant="secondary">Source Attribution</Badge>
                  <Badge variant="secondary">Content Extraction</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Unlike traditional search APIs, Tavily provides search results specifically optimized for AI consumption,
                  with clean content extraction and relevance scoring.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="memory" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Mem0 Memory System</CardTitle>
                <CardDescription>
                  Persistent, personalized conversation memory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">User Preferences</Badge>
                  <Badge variant="secondary">Context Awareness</Badge>
                  <Badge variant="secondary">Learning Adaptation</Badge>
                  <Badge variant="secondary">Cross-Session</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  The AI remembers your preferences, conversation history, and context across sessions,
                  providing increasingly personalized and relevant responses over time.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="backend" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Appwrite Backend</CardTitle>
                <CardDescription>
                  Complete backend-as-a-service integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Authentication</Badge>
                  <Badge variant="secondary">Real-time Database</Badge>
                  <Badge variant="secondary">File Storage</Badge>
                  <Badge variant="secondary">Cloud Functions</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Secure user management, conversation persistence, and real-time synchronization
                                      across devices with Appwrite&apos;s comprehensive backend services.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to experience the future of search?
          </h3>
          <p className="text-lg text-gray-600 mb-8">
            Start chatting with our AI-powered assistant today.
          </p>
          <Link href="/chat">
            <Button size="lg" className="px-8 py-4 text-lg">
              <MessageSquare className="w-5 h-5 mr-2" />
              Start Chatting Now
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">Tavily Chatbot</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <a href="https://docs.tavily.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                Tavily Docs
              </a>
              <a href="https://docs.mem0.ai" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600">
                Mem0 Docs
              </a>
              <a href="https://appwrite.io/docs" target="_blank" rel="noopener noreferrer" className="hover:text-orange-600">
                Appwrite Docs
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
