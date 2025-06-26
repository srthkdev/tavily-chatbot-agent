"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useStorage } from "@/hooks/useStorage"
import { clientConfig as config } from "@/config/tavily.config"
import { 
  Globe, 
  ArrowRight, 
  Settings, 
  Loader2, 
  CheckCircle2, 
  FileText, 
  AlertCircle,
  Database,
  Zap,
  Search,
  Sparkles,
  Lock,
  ExternalLink
} from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function TavilyPage() {
  const router = useRouter()
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const urlParam = searchParams.get('url')
  const { saveIndex } = useStorage()
  
  const [url, setUrl] = useState(urlParam || 'https://docs.tavily.com/')
  const [hasInteracted, setHasInteracted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [pageLimit, setPageLimit] = useState(config.tavily.defaultLimit)
  const [isCreationDisabled, setIsCreationDisabled] = useState<boolean | undefined>(undefined)
  const [crawlProgress, setCrawlProgress] = useState<{
    status: string
    pagesFound: number
    pagesScraped: number
    currentPage?: string
  } | null>(null)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [tavilyApiKey, setTavilyApiKey] = useState<string>("")
  const [isValidatingApiKey, setIsValidatingApiKey] = useState(false)
  const [hasTavilyKey, setHasTavilyKey] = useState(false)

  useEffect(() => {
    // Check environment and API keys
    fetch('/api/check-env')
      .then(res => res.json())
      .then(data => {
        setIsCreationDisabled(data.environmentStatus.DISABLE_CHATBOT_CREATION || false)
        
        // Check for Tavily API key
        const hasEnvTavily = data.environmentStatus.TAVILY_API_KEY
        setHasTavilyKey(hasEnvTavily)
        
        if (!hasEnvTavily) {
          // Check localStorage for saved API key
          const savedKey = localStorage.getItem('tavily_api_key')
          if (savedKey) {
            setTavilyApiKey(savedKey)
            setHasTavilyKey(true)
          }
        }
      })
      .catch(() => {
        setIsCreationDisabled(false)
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    // Check if we have Tavily API key
    if (!hasTavilyKey && !localStorage.getItem('tavily_api_key')) {
      setShowApiKeyModal(true)
      return
    }

    // Normalize URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl
    }
    
    // Validate URL
    try {
      new URL(normalizedUrl)
    } catch {
      toast.error('Please enter a valid URL')
      return
    }

    setLoading(true)
    setCrawlProgress({
      status: 'Starting search...',
      pagesFound: 0,
      pagesScraped: 0
    })
    
    interface SearchResponse {
      success: boolean
      namespace: string
      message: string
      details: {
        url: string
        resultsFound: number
      }
      data: Array<{
        url?: string
        title?: string
        content?: string
        published_date?: string
        score?: number
      }>
    }
    
    let data: SearchResponse | null = null
    
    try {
      // Simulate progressive updates
      let currentProgress = 0
      
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 2
        if (currentProgress > pageLimit * 0.8) {
          clearInterval(progressInterval)
        }
        
        setCrawlProgress(prev => {
          if (!prev) return null
          const processed = Math.min(Math.floor(currentProgress), pageLimit)
          return {
            ...prev,
            status: processed < pageLimit * 0.3 ? 'Searching web content...' : 
                   processed < pageLimit * 0.7 ? 'Processing results...' : 
                   'Finalizing...',
            pagesFound: pageLimit,
            pagesScraped: processed,
            currentPage: processed > 0 ? `Processing result ${processed} of ${pageLimit}` : undefined
          }
        })
      }, 300)
      
      // Get API key from localStorage if not in environment
      const tavilyApiKey = localStorage.getItem('tavily_api_key')
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // Add API key to headers if available from localStorage (and not in env)
      if (tavilyApiKey) {
        headers['X-Tavily-API-Key'] = tavilyApiKey
      }
      
      const response = await fetch('/api/tavily/create-bot', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          url: normalizedUrl, 
          maxResults: pageLimit,
          searchDepth: config.tavily.searchDepth 
        })
      })

      data = await response.json()
      
      // Clear the interval
      if (progressInterval) clearInterval(progressInterval)
      
      if (data && data.success) {
        // Update progress to show completion
        setCrawlProgress({
          status: 'Search complete!',
          pagesFound: data.details?.resultsFound || 0,
          pagesScraped: data.details?.resultsFound || 0
        })
        
        // Find the best metadata from results
        let homepageMetadata: {
          title?: string
          description?: string
          favicon?: string
          ogImage?: string
        } = {}
        
        if (data.data && data.data.length > 0) {
          const bestResult = data.data.find((result) => {
            return result.url === normalizedUrl || result.url === normalizedUrl + '/' || result.url === normalizedUrl.replace(/\/$/, '')
          }) || data.data[0] // Fallback to first result
          
          homepageMetadata = {
            title: bestResult.title || new URL(normalizedUrl).hostname,
            description: bestResult.content?.substring(0, 200) || 'AI-powered search chatbot',
            favicon: undefined, // Tavily doesn't provide favicons
            ogImage: undefined // Tavily doesn't provide images in this context
          }
        }
        
        // Store the search info and redirect to dashboard
        const siteInfo = {
          url: normalizedUrl,
          namespace: data.namespace,
          resultsFound: data.details?.resultsFound || 0,
          searchComplete: true,
          searchDate: new Date().toISOString(),
          metadata: {
            title: homepageMetadata.title || new URL(normalizedUrl).hostname,
            description: homepageMetadata.description || 'AI-powered search chatbot for ' + new URL(normalizedUrl).hostname,
            favicon: homepageMetadata.favicon,
            ogImage: homepageMetadata.ogImage
          }
        }
        
        // Store only metadata for current session
        sessionStorage.setItem('tavily_current_data', JSON.stringify(siteInfo))
        
        // Save index metadata using the storage hook
        await saveIndex({
          url: normalizedUrl,
          namespace: data.namespace,
          pagesCrawled: data.details?.resultsFound || 0,
          createdAt: new Date().toISOString(),
          metadata: {
            title: homepageMetadata.title || new URL(normalizedUrl).hostname,
            description: homepageMetadata.description || 'AI-powered search chatbot for ' + new URL(normalizedUrl).hostname,
            favicon: homepageMetadata.favicon,
            ogImage: homepageMetadata.ogImage
          }
        })
        
        // Redirect to chat page
        router.push(`/chat?namespace=${data.namespace}`)
      } else {
        throw new Error(data?.message || 'Failed to create chatbot')
      }
    } catch (error) {
      console.error('Creation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create chatbot'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
      setCrawlProgress(null)
    }
  }

  const handleApiKeySubmit = async () => {
    if (!tavilyApiKey.trim()) {
      toast.error('Please enter your Tavily API key')
      return
    }

    setIsValidatingApiKey(true)
    
    try {
      // Validate API key by making a test request
      const response = await fetch('/api/tavily/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tavily-API-Key': tavilyApiKey,
        },
        body: JSON.stringify({ query: 'test', maxResults: 1 })
      })

      if (response.ok) {
        localStorage.setItem('tavily_api_key', tavilyApiKey)
        setHasTavilyKey(true)
        setShowApiKeyModal(false)
        toast.success('API key saved successfully!')
      } else {
        toast.error('Invalid API key. Please check your key and try again.')
      }
    } catch (error) {
      console.error('API key validation error:', error)
      toast.error('Failed to validate API key. Please try again.')
    } finally {
      setIsValidatingApiKey(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <div className="border-b border-orange-100 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{config.app.name}</h1>
                <p className="text-xs text-gray-500">Instant AI Chatbots for Any Website</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <Database className="w-4 h-4 mr-2" />
                  My Chatbots
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Search className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Instant AI Chatbots for{' '}
            <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Any Website
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transform any website into a knowledgeable AI assistant. Powered by Tavily search and advanced AI models.
          </p>
          
          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-orange-100">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Search className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Tavily-Powered Search</h3>
              <p className="text-sm text-gray-600">Real-time web search optimized for AI applications</p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-orange-100">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Instant Creation</h3>
              <p className="text-sm text-gray-600">From URL to chatbot in under a minute</p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-orange-100">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Memory</h3>
              <p className="text-sm text-gray-600">Persistent memory with Mem0 integration</p>
            </div>
          </div>
        </div>

        {/* Creation Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-orange-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    setHasInteracted(true)
                  }}
                  className="pl-11 h-12 text-lg border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSettings(!showSettings)}
                className="text-gray-600 border-gray-200 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              
              <Button
                type="submit"
                disabled={loading || isCreationDisabled || !url.trim()}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 h-12"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Chatbot
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="border-t pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Results Limit
                  </label>
                  <select
                    value={pageLimit}
                    onChange={(e) => setPageLimit(Number(e.target.value))}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:border-orange-300 focus:ring-orange-200"
                    disabled={loading}
                  >
                    {config.tavily.limitOptions.map((limit) => (
                      <option key={limit} value={limit}>
                        {limit} results
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    More results = better knowledge but slower creation
                  </p>
                </div>
              </div>
            )}
          </form>

          {/* Progress Display */}
          {crawlProgress && (
            <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-900">{crawlProgress.status}</span>
                <span className="text-sm text-orange-600">
                  {crawlProgress.pagesScraped} / {crawlProgress.pagesFound}
                </span>
              </div>
              <div className="w-full bg-orange-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((crawlProgress.pagesScraped / crawlProgress.pagesFound) * 100, 100)}%`,
                  }}
                />
              </div>
              {crawlProgress.currentPage && (
                <p className="text-xs text-orange-700 mt-2">{crawlProgress.currentPage}</p>
              )}
            </div>
          )}

          {/* Warnings */}
          {isCreationDisabled && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  Chatbot creation is currently disabled. You can only view existing chatbots.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API Key Modal */}
      <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tavily API Key Required</DialogTitle>
            <DialogDescription>
              Please enter your Tavily API key to create chatbots. You can get one for free at{' '}
              <a 
                href="https://tavily.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-600 hover:underline"
              >
                tavily.com
              </a>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder="Enter your Tavily API key"
              value={tavilyApiKey}
              onChange={(e) => setTavilyApiKey(e.target.value)}
              type="password"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApiKeySubmit}
              disabled={isValidatingApiKey || !tavilyApiKey.trim()}
            >
              {isValidatingApiKey ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                'Save Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
