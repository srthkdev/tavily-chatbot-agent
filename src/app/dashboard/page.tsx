"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

  // Only use database chatbots (no localStorage fallback)
  const allChatbots = chatbots

  const filteredIndexes = allChatbots.filter(chatbot => 
    !searchQuery || 
    chatbot.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chatbot.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chatbot.url?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (chatbotId: string) => {
    try {
      const response = await fetch(`/api/chatbots/${chatbotId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        // Refresh the chatbots list
        const updatedResponse = await fetch('/api/chatbots')
        if (updatedResponse.ok) {
          const result = await updatedResponse.json()
          if (result.success) {
            setChatbots(result.data)
          }
        }
        toast.success('Chatbot deleted successfully')
        setDeleteModal({ show: false })
      } else {
        throw new Error('Failed to delete chatbot')
      }
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
              onClick={async () => {
                setChatbotsLoading(true)
                try {
                  const response = await fetch('/api/chatbots')
                  if (response.ok) {
                    const result = await response.json()
                    if (result.success) {
                      setChatbots(result.data)
                      toast.success('Chatbots refreshed')
                    }
                  }
                } catch (error) {
                  console.error('Failed to refresh chatbots:', error)
                  toast.error('Failed to refresh chatbots')
                } finally {
                  setChatbotsLoading(false)
                }
              }}
              disabled={chatbotsLoading}
              className="shrink-0"
            >
              <Database className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>


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
            {filteredIndexes.map((chatbot) => (
              <Card 
                key={chatbot.$id} 
                className="group hover:shadow-lg transition-all duration-200 border-orange-100 hover:border-orange-200 bg-white/80 backdrop-blur-sm"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                        {chatbot.name || new URL(chatbot.url || '').hostname}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {chatbot.description || `AI chatbot for ${new URL(chatbot.url || '').hostname}`}
                      </CardDescription>
                    </div>
                    {chatbot.favicon && (
                      <img 
                        src={chatbot.favicon} 
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
                      <span className="truncate">{chatbot.url}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(chatbot.url || '', `url-${chatbot.$id}`)}
                      >
                        {copiedItem === `url-${chatbot.$id}` ? (
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
                        <span>{chatbot.pagesCrawled} results</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{formatDate(chatbot.createdAt)}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center">
                      <Badge 
                        variant={chatbot.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {chatbot.status}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-2">
                      <div className="flex items-center gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => router.push(`/chat?namespace=${chatbot.namespace}&name=${encodeURIComponent(chatbot.name || '')}`)}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Chat
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            // Check if chatbot exists before navigating
                            fetch(`/api/chatbots/${chatbot.$id}`)
                              .then(response => {
                                if (response.ok) {
                                  router.push(`/admin/${chatbot.$id}`)
                                } else {
                                  toast.error('Chatbot not found')
                                  // Refresh the list
                                  window.location.reload()
                                }
                              })
                              .catch(() => {
                                toast.error('Error accessing chatbot')
                              })
                          }}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Manage
                        </Button>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(chatbot.url, '_blank')}
                        className="px-3"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteModal({ 
                          show: true, 
                          namespace: chatbot.$id,
                          title: chatbot.name || new URL(chatbot.url || '').hostname
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