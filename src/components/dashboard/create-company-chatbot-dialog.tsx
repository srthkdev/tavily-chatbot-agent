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
import { Building2, Loader2, Globe, MapPin, Briefcase } from 'lucide-react'
import { toast } from 'sonner'

interface CreateCompanyChatbotDialogProps {
  onChatbotCreated?: (chatbot: unknown) => void
  triggerButton?: React.ReactNode
}

export function CreateCompanyChatbotDialog({ 
  onChatbotCreated, 
  triggerButton 
}: CreateCompanyChatbotDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    company: '',
    companyUrl: '',
    industry: '',
    hqLocation: '',
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.company.trim()) return

    setIsLoading(true)

    try {
      // Normalize URL if provided
      let normalizedUrl = formData.companyUrl.trim()
      if (normalizedUrl && !normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl
      }

      // Validate URL if provided
      if (normalizedUrl) {
        try {
          new URL(normalizedUrl)
        } catch {
          throw new Error('Please enter a valid URL')
        }
      }

      // First, run company research to get comprehensive data
      const researchResponse = await fetch('/api/company-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: formData.company.trim(),
          companyUrl: normalizedUrl || undefined,
          industry: formData.industry.trim() || undefined,
          hqLocation: formData.hqLocation.trim() || undefined
        })
      })

      if (!researchResponse.ok) {
        const error = await researchResponse.json()
        throw new Error(error.error || 'Failed to research company')
      }

      const researchResult = await researchResponse.json()
      const { companyInfo, report } = researchResult.data

      // Create chatbot with research data
      const chatbotResponse = await fetch('/api/tavily/create-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Use company URL if available, otherwise use a placeholder
          url: normalizedUrl || `https://${formData.company.toLowerCase().replace(/\s+/g, '')}.com`,
          name: `${formData.company} Assistant`,
          description: formData.description.trim() || `AI assistant for ${formData.company} with comprehensive company research and knowledge.`,
          type: 'company',
          companyData: {
            name: formData.company,
            url: normalizedUrl,
            industry: formData.industry || companyInfo?.industry,
            hqLocation: formData.hqLocation || companyInfo?.hqLocation,
            researchReport: report,
            companyInfo: companyInfo,
            generatedAt: new Date().toISOString()
          }
        })
      })

      if (!chatbotResponse.ok) {
        const error = await chatbotResponse.json()
        throw new Error(error.error || 'Failed to create company chatbot')
      }

      const chatbotResult = await chatbotResponse.json()
      
      toast.success(`${formData.company} chatbot created successfully!`)
      
      // Call callback if provided
      onChatbotCreated?.(chatbotResult.chatbot)

      // Reset form and close dialog
      setFormData({ 
        company: '', 
        companyUrl: '', 
        industry: '', 
        hqLocation: '', 
        description: '' 
      })
      setOpen(false)

    } catch (error) {
      console.error('Error creating company chatbot:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create company chatbot')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompanyChange = (company: string) => {
    setFormData(prev => ({ ...prev, company }))
    
    // Auto-generate description if empty
    if (!formData.description && company) {
      const generatedDescription = `AI assistant for ${company} with comprehensive company research, financial insights, and industry analysis.`
      setFormData(prev => ({ ...prev, description: generatedDescription }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
            <Building2 className="w-4 h-4 mr-2" />
            Create Company Chatbot
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Create Company Research Chatbot
          </DialogTitle>
          <DialogDescription>
            Create an AI assistant with comprehensive company research capabilities. The bot will analyze financial data, 
            recent news, industry trends, and company information to provide expert-level insights.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company"
                  placeholder="Apple Inc."
                  value={formData.company}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyUrl">Company Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="companyUrl"
                  placeholder="https://apple.com"
                  value={formData.companyUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyUrl: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="industry"
                  placeholder="Technology"
                  value={formData.industry}
                  onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hqLocation">Headquarters</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="hqLocation"
                  placeholder="Cupertino, CA"
                  value={formData.hqLocation}
                  onChange={(e) => setFormData(prev => ({ ...prev, hqLocation: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="AI assistant for [Company] with comprehensive research capabilities..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What your chatbot will include:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Comprehensive company research and analysis</li>
              <li>• Financial data and market insights</li>
              <li>• Recent news and developments</li>
              <li>• Industry trends and competitive analysis</li>
              <li>• Company culture and leadership information</li>
              <li>• Memory of conversations for personalized responses</li>
            </ul>
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
            <Button 
              type="submit" 
              disabled={!formData.company.trim() || isLoading}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating & Researching...
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  Create Company Chatbot
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 