"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useResearchStore } from '@/stores/research-store'
import { Search, Building2, Globe, MapPin, Briefcase, Loader2, CheckCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface GenerateResearchButtonProps {
  projectId: string
  projectName: string
  projectUrl?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onResearchGenerated?: (research: any) => void
  className?: string
}

interface LogEntry {
  id: string
  message: string
  status: 'pending' | 'completed' | 'error'
  timestamp: Date
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
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [currentProgress, setCurrentProgress] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  const {
    currentResearch,
    setCurrentResearch,
    addResearch
  } = useResearchStore()

  const addLog = (message: string, status: 'pending' | 'completed' | 'error' = 'pending') => {
    const logEntry: LogEntry = {
      id: Date.now().toString(),
      message,
      status,
      timestamp: new Date()
    }
    setLogs(prev => [...prev, logEntry])
    return logEntry.id
  }

  const updateLog = (id: string, status: 'completed' | 'error', message?: string) => {
    setLogs(prev => prev.map(log => 
      log.id === id 
        ? { ...log, status, message: message || log.message }
        : log
    ))
  }

  const handleGenerate = async () => {
    if (!formData.company.trim()) {
      toast.error('Company name is required')
      return
    }

    try {
      setIsGenerating(true)
      setLogs([])
      setCurrentProgress(0)

      // Step 1: Initialize research
      const initLog = addLog('Initializing research process...')
      await new Promise(resolve => setTimeout(resolve, 500))
      updateLog(initLog, 'completed')
      setCurrentProgress(10)

      // Step 2: Company data collection
      const companyLog = addLog('Collecting company information...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      updateLog(companyLog, 'completed')
      setCurrentProgress(25)

      // Step 3: Web search
      const searchLog = addLog('Searching for recent news and updates...')
      await new Promise(resolve => setTimeout(resolve, 1500))
      updateLog(searchLog, 'completed')
      setCurrentProgress(40)

      // Step 4: Financial data
      const financialLog = addLog('Gathering financial information...')
      await new Promise(resolve => setTimeout(resolve, 1200))
      updateLog(financialLog, 'completed')
      setCurrentProgress(55)

      // Step 5: Industry analysis
      const industryLog = addLog('Analyzing industry trends...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      updateLog(industryLog, 'completed')
      setCurrentProgress(70)

      // Step 6: Competitive analysis
      const competitiveLog = addLog('Researching competitors...')
      await new Promise(resolve => setTimeout(resolve, 1300))
      updateLog(competitiveLog, 'completed')
      setCurrentProgress(85)

      // Step 7: Generate report
      const reportLog = addLog('Generating comprehensive report...')
      
      const response = await fetch(`/api/projects/${projectId}/research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: formData.company,
          companyUrl: formData.companyUrl,
          industry: formData.industry,
          hqLocation: formData.hqLocation
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate research')
      }

      const result = await response.json()
      
      if (result.success && result.data.researchData) {
        updateLog(reportLog, 'completed')
        setCurrentProgress(100)
        
        // Step 8: Finalize
        const finalLog = addLog('Research completed successfully!')
        updateLog(finalLog, 'completed')
        
        // Update research store
        const researchData = result.data.researchData
        addResearch(researchData)
        setCurrentResearch(researchData)
        
        toast.success('Research generated successfully!')
        
        // Wait a moment to show completion
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setIsOpen(false)
        onResearchGenerated?.(result.data)
      } else {
        throw new Error(result.error || 'Failed to generate research')
      }
    } catch (error) {
      console.error('Research generation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      addLog(`Error: ${errorMessage}`, 'error')
      toast.error('Failed to generate research')
    } finally {
      setIsGenerating(false)
    }
  }

  const resetDialog = () => {
    setLogs([])
    setCurrentProgress(0)
    setIsGenerating(false)
  }

  const hasExistingResearch = currentResearch?.chatbotId === projectId

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetDialog()
    }}>
      <DialogTrigger asChild>
        <Button 
          className={`${className} ${hasExistingResearch 
            ? 'bg-blue-600 hover:bg-blue-700' 
            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
          } text-white font-medium px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300`}
        >
          <Search className="h-4 w-4 mr-2" />
          {hasExistingResearch ? 'Regenerate Research' : 'Generate Research'}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {hasExistingResearch ? 'Regenerate Research' : 'Generate Company Research'}
          </DialogTitle>
          <DialogDescription>
            Generate comprehensive research for your company including financial data, market analysis, and competitive insights.
          </DialogDescription>
        </DialogHeader>
        
        {!isGenerating ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company Name *
                </Label>
                <Input
                  id="company"
                  placeholder="Enter company name"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companyUrl" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Company Website
                </Label>
                <Input
                  id="companyUrl"
                  placeholder="https://company.com"
                  value={formData.companyUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyUrl: e.target.value }))}
                  className="w-full"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Industry
                  </Label>
                  <Input
                    id="industry"
                    placeholder="e.g., Technology, Healthcare"
                    value={formData.industry}
                    onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hqLocation" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    HQ Location
                  </Label>
                  <Input
                    id="hqLocation"
                    placeholder="e.g., San Francisco, CA"
                    value={formData.hqLocation}
                    onChange={(e) => setFormData(prev => ({ ...prev, hqLocation: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!formData.company.trim()}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                <Search className="h-4 w-4 mr-2" />
                Generate Research
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Research Progress</h3>
                <span className="text-sm text-gray-500">{currentProgress}%</span>
              </div>
              <Progress value={currentProgress} className="w-full" />
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              <h4 className="font-medium text-sm text-gray-700">Live Progress Log</h4>
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-gray-50">
                  {log.status === 'pending' && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  )}
                  {log.status === 'completed' && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  {log.status === 'error' && (
                    <div className="h-4 w-4 rounded-full bg-red-600" />
                  )}
                  <span className={`flex-1 ${log.status === 'error' ? 'text-red-600' : 'text-gray-700'}`}>
                    {log.message}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 