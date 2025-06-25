"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Loader2, Globe } from 'lucide-react'

interface CreateChatbotDialogProps {
  onChatbotCreated?: (chatbot: any) => void
}

export function CreateChatbotDialog({ onChatbotCreated }: CreateChatbotDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    url: '',
    name: '',
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.url.trim()) return

    setIsLoading(true)

    try {
      // Normalize URL
      let normalizedUrl = formData.url.trim()
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl
      }

      // Validate URL
      new URL(normalizedUrl)

      const response = await fetch('/api/tavily/create-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: normalizedUrl,
          name: formData.name.trim() || undefined,
          description: formData.description.trim() || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create chatbot')
      }

      const result = await response.json()
      
      // Call callback if provided
      onChatbotCreated?.(result.chatbot)

      // Reset form and close dialog
      setFormData({ url: '', name: '', description: '' })
      setOpen(false)

    } catch (error) {
      console.error('Error creating chatbot:', error)
      alert(error instanceof Error ? error.message : 'Failed to create chatbot')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, url }))
    
    // Auto-generate name from URL if name is empty
    if (!formData.name && url) {
      try {
        const domain = new URL(url.startsWith('http') ? url : 'https://' + url).hostname
        const siteName = domain.replace('www.', '').split('.')[0]
        const generatedName = siteName.charAt(0).toUpperCase() + siteName.slice(1) + ' Assistant'
        setFormData(prev => ({ ...prev, name: generatedName }))
      } catch {
        // Invalid URL, ignore
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Chatbot
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Chatbot</DialogTitle>
          <DialogDescription>
            Create a specialized chatbot by providing a website URL. The bot will be trained on the content from that site.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="url"
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Chatbot Name (Optional)</Label>
            <Input
              id="name"
              placeholder="AI Assistant"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Describe what this chatbot helps with..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.url.trim() || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Chatbot'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 