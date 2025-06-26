"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useStorage } from "@/hooks/useStorage"
import { clientConfig as config } from "@/config/tavily.config"
import { useAuth } from "@/contexts/auth-context"
import { 
  Globe, 
  MessageSquare, 
  Trash2, 
  ExternalLink,
  Search,
  Plus,
  Clock,
  Database,
  Loader2,
  ArrowLeft,
  Settings,
  Copy,
  Check,
  AlertCircle
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

export default function DashboardPage() {
  const router = useRouter()
  const { indexes, loading, error, deleteIndex, refresh } = useStorage()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; namespace?: string; title?: string }>({ show: false })
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const [chatbots, setChatbots] = useState<any[]>([])
  const [chatbotsLoading, setChatbotsLoading] = useState(true)

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth')
    }
  }, [authLoading, isAuthenticated, router])

  // Load chatbots from database
  useEffect(() => {
    const loadChatbots = async () => {
      if (!isAuthenticated) return
      
      try {
        setChatbotsLoading(true)
        const response = await fetch('/api/chatbots')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setChatbots(result.data)
          }
        }
      } catch (error) {
        console.error('Failed to load chatbots:', error)
      } finally {
        setChatbotsLoading(false)
      }
    }

    loadChatbots()
  }, [isAuthenticated])

  // Combine chatbots from database and localStorage
  const allChatbots = [...chatbots, ...indexes.filter(index => 
    !chatbots.some(bot => bot.namespace === index.namespace)
  )]

  const filteredIndexes = allChatbots.filter(index => 
    !searchQuery || 
    (index.metadata?.title || index.name)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    index.url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (namespace: string) => {
    try {
      await deleteIndex(namespace)
      toast.success('Chatbot deleted successfully')
      setDeleteModal({ show: false })
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete chatbot')
    }
  }

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItem(itemId)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedItem(null), 2000)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Unknown'
    }
  }

  if (authLoading || chatbotsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your chatbots...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <div className="border-b border-orange-100 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Chatbots</h1>
                              <p className="text-sm text-gray-500">
                {allChatbots.length} chatbot{allChatbots.length !== 1 ? 's' : ''} created
              </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Controls */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search chatbots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={refresh}
              disabled={loading}
              className="shrink-0"
            >
              <Database className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Chatbots Grid */}
        {filteredIndexes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {allChatbots.length === 0 ? 'No chatbots yet' : 'No matching chatbots'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {allChatbots.length === 0 
                ? 'Create your first AI chatbot by entering a website URL.' 
                : 'Try adjusting your search query to find your chatbots.'
              }
            </p>
            {allChatbots.length === 0 && (
              <Link href="/">
                <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Chatbot
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIndexes.map((index) => (
              <Card 
                key={index.namespace} 
                className="group hover:shadow-lg transition-all duration-200 border-orange-100 hover:border-orange-200 bg-white/80 backdrop-blur-sm"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                        {index.name || index.metadata?.title || new URL(index.url).hostname}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {index.description || index.metadata?.description || `AI chatbot for ${new URL(index.url).hostname}`}
                      </CardDescription>
                    </div>
                    {(index.favicon || index.metadata?.favicon) && (
                      <img 
                        src={index.favicon || index.metadata?.favicon} 
                        alt="Favicon" 
                        className="w-6 h-6 rounded-sm flex-shrink-0 ml-2"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* URL */}
                    <div className="flex items-center text-sm text-gray-600">
                      <Globe className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{index.url}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(index.url, `url-${index.namespace}`)}
                      >
                        {copiedItem === `url-${index.namespace}` ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-600">
                        <Database className="w-4 h-4 mr-1" />
                        <span>{index.pagesCrawled} results</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{formatDate(index.createdAt || index.$createdAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-2">
                      <Link href={`/chat?namespace=${index.namespace}`} className="flex-1">
                        <Button 
                          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                          size="sm"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Chat
                        </Button>
                      </Link>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(index.url, '_blank')}
                        className="px-3"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteModal({ 
                          show: true, 
                          namespace: index.namespace,
                          title: index.name || index.metadata?.title || new URL(index.url).hostname
                        })}
                        className="px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal.show} onOpenChange={(open) => setDeleteModal({ show: open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chatbot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteModal.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteModal({ show: false })}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteModal.namespace && handleDelete(deleteModal.namespace)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 