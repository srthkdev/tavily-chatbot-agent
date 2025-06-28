"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

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
  Building2,
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

  // Load projects from database
  useEffect(() => {
    const loadProjects = async () => {
      if (!isAuthenticated) return
      
      try {
        setChatbotsLoading(true)
        const response = await fetch('/api/projects')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setChatbots(result.data)
          }
        }
      } catch (error) {
        console.error('Failed to load projects:', error)
      } finally {
        setChatbotsLoading(false)
      }
    }

    loadProjects()
  }, [isAuthenticated])

  // Only use database chatbots (no localStorage fallback)
  const allChatbots = chatbots

  const filteredIndexes = allChatbots.filter(chatbot => 
    !searchQuery || 
    chatbot.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chatbot.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chatbot.url?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        // Refresh the projects list
        const updatedResponse = await fetch('/api/projects')
        if (updatedResponse.ok) {
          const result = await updatedResponse.json()
          if (result.success) {
            setChatbots(result.data)
          }
        }
        toast.success('Project deleted successfully')
        setDeleteModal({ show: false })
      } else {
        throw new Error('Failed to delete project')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete project')
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your projects...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to auth
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <div className="border-b bg-card backdrop-blur-sm">
            <div className="flex items-center px-4 py-4">
              <SidebarTrigger className="mr-4" />
              <div className="flex justify-between items-center w-full">
                <div>
                  <h1 className="text-xl font-bold text-foreground">My Projects</h1>
                  <p className="text-sm text-muted-foreground">
                    {allChatbots.length} project{allChatbots.length !== 1 ? 's' : ''} created
                  </p>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Link href="/">
                    <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Project
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Search and Controls */}
        <div className="mb-8">
                      <div className="flex items-center space-x-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search projects..."
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
                  const response = await fetch('/api/projects')
                  if (response.ok) {
                    const result = await response.json()
                    if (result.success) {
                      setChatbots(result.data)
                      toast.success('Projects refreshed')
                    }
                  }
                } catch (error) {
                  console.error('Failed to refresh projects:', error)
                  toast.error('Failed to refresh projects')
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
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {allChatbots.length === 0 ? 'No chatbots yet' : 'No matching chatbots'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {allChatbots.length === 0 
                ? 'Create your first AI chatbot by entering a website URL.' 
                : 'Try adjusting your search query to find your chatbots.'
              }
            </p>
            {allChatbots.length === 0 && (
              <Link href="/">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Project
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIndexes.map((chatbot) => (
              <Card 
                key={chatbot.$id} 
                className="group hover:shadow-lg transition-all duration-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold truncate">
                        {chatbot.name || new URL(chatbot.url || '').hostname}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1 line-clamp-2">
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
                    <div className="flex items-center text-sm text-muted-foreground">
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
                      <div className="flex items-center text-muted-foreground">
                        <Database className="w-4 h-4 mr-1" />
                        <span>{chatbot.pagesCrawled} results</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
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
                          onClick={() => router.push(`/project/${chatbot.$id}`)}
                        >
                          <Building2 className="w-4 h-4 mr-2" />
                          Open Project
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/project/${chatbot.$id}?tab=chat`)}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Chat
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
      </SidebarInset>
    </SidebarProvider>
  )
} 