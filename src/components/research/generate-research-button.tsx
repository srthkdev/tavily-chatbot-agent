"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useResearchStore } from '@/stores/research-store'
import { Search, Building2, Globe, MapPin, Briefcase, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface GenerateResearchButtonProps {
  projectId: string
  projectName: string
  projectUrl?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onResearchGenerated?: (research: any) => void
  className?: string
}

export function GenerateResearchButton({
  projectId,
  projectName,
  projectUrl = '',
  onResearchGenerated,
  className = ''
}: GenerateResearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    company: projectName,
    companyUrl: projectUrl,
    industry: '',
    hqLocation: ''
  })

  const {
    isGenerating,
    generationProgress,
    generationStatus,
    generateResearch,
    currentResearch
  } = useResearchStore()

  const handleGenerate = async () => {
    if (!formData.company.trim()) {
      toast.error('Company name is required')
      return
    }

    try {
      const research = await generateResearch(projectId, formData)
      
      if (research) {
        toast.success('Research generated successfully!')
        setIsOpen(false)
        onResearchGenerated?.(research)
      } else {
        toast.error('Failed to generate research')
      }
    } catch (error) {
      console.error('Research generation error:', error)
      toast.error('Failed to generate research')
    }
  }

  const hasExistingResearch = currentResearch?.chatbotId === projectId

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={hasExistingResearch ? "outline" : "default"}
          className={className}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : hasExistingResearch ? (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Regenerate Research
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Generate Research
            </>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {hasExistingResearch ? 'Regenerate' : 'Generate'} Company Research
          </DialogTitle>
          <DialogDescription>
            {hasExistingResearch 
              ? 'Generate fresh research data for this company. This will replace existing research.'
              : 'Generate comprehensive research data including company info, financials, news, and industry analysis.'
            }
          </DialogDescription>
        </DialogHeader>
        
        {isGenerating ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Research Progress</span>
                <span className="text-muted-foreground">{generationProgress}%</span>
              </div>
              <Progress value={generationProgress} className="h-2" />
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{generationStatus}</span>
            </div>
            
            <div className="text-xs text-muted-foreground">
              This may take 30-60 seconds to complete...
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Company Name *
              </Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="e.g., Apple Inc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyUrl" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Company Website
              </Label>
              <Input
                id="companyUrl"
                type="url"
                value={formData.companyUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, companyUrl: e.target.value }))}
                placeholder="https://company.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Industry
                </Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  placeholder="e.g., Technology"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hqLocation" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Headquarters
                </Label>
                <Input
                  id="hqLocation"
                  value={formData.hqLocation}
                  onChange={(e) => setFormData(prev => ({ ...prev, hqLocation: e.target.value }))}
                  placeholder="e.g., Cupertino, CA"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !formData.company.trim()}
              >
                <Search className="w-4 h-4 mr-2" />
                {hasExistingResearch ? 'Regenerate' : 'Generate'} Research
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 