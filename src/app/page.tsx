"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { 
  Building2, 
  ArrowRight, 
  Loader2, 
  Globe,
  MapPin,
  Briefcase,
  Database,
  Zap,
  Search,
  Sparkles,
  BarChart3,
  MessageSquare,
  Settings,
  TrendingUp,
  Users,
  FileText,
  Clock,
  CheckCircle,
  Activity
} from "lucide-react"
import { toast } from "sonner"

interface LogEntry {
  id: string
  message: string
  status: 'pending' | 'completed' | 'error'
  timestamp: Date
  company?: string
}

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  
  const [formData, setFormData] = useState({
    company: '',
    companyUrl: '',
    industry: '',
    hqLocation: ''
  })
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const addLog = (message: string, status: 'pending' | 'completed' | 'error' = 'pending', company?: string) => {
    const logEntry: LogEntry = {
      id: Date.now().toString(),
      message,
      status,
      timestamp: new Date(),
      company
    }
    setLogs(prev => [logEntry, ...prev.slice(0, 9)]) // Keep only 10 most recent logs
    return logEntry.id
  }

  const updateLog = (id: string, status: 'completed' | 'error', message?: string) => {
    setLogs(prev => prev.map(log => 
      log.id === id 
        ? { ...log, status, message: message || log.message }
        : log
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.company.trim()) return

    // Check authentication first
    if (!isAuthenticated) {
      // Store the form data in localStorage so we can continue after auth
      localStorage.setItem('pending_company_project', JSON.stringify(formData))
      router.push('/auth')
      return
    }

    setLoading(true)
    
    try {
      // Add initial log
      const initLog = addLog(`Starting research for ${formData.company}...`, 'pending', formData.company)

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

      // Step 1: Research
      const researchLog = addLog(`Analyzing ${formData.company} business data...`, 'pending', formData.company)
      
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

      updateLog(researchLog, 'completed', `Business analysis completed for ${formData.company}`)
      updateLog(initLog, 'completed')

      // Step 2: Create project
      const projectLog = addLog(`Creating AI assistant for ${formData.company}...`, 'pending', formData.company)

      // Create chatbot with research data
      const chatbotResponse = await fetch('/api/tavily/create-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Use company URL if available, otherwise use a placeholder
          url: normalizedUrl || `https://${formData.company.toLowerCase().replace(/\s+/g, '')}.com`,
          name: `${formData.company} Assistant`,
          description: `AI assistant for ${formData.company} with comprehensive company research and knowledge.`,
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
        throw new Error(error.error || 'Failed to create company project')
      }

      const chatbotResult = await chatbotResponse.json()
      
      updateLog(projectLog, 'completed', `${formData.company} project created successfully!`)
      
      toast.success(`${formData.company} project created successfully!`)
      
      // Clear localStorage
      localStorage.removeItem('pending_company_project')

      // Navigate to the project workspace
      router.push(`/project/${chatbotResult.chatbot.$id}`)

    } catch (error) {
      console.error('Error creating company project:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create company project'
      addLog(`Error: ${errorMessage}`, 'error', formData.company)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Handle authenticated user returning with pending project creation
  useEffect(() => {
    if (isAuthenticated) {
      const pendingData = localStorage.getItem('pending_company_project')
      if (pendingData) {
        try {
          const data = JSON.parse(pendingData)
          setFormData(data)
          localStorage.removeItem('pending_company_project')
          toast.info('Welcome back! Please review and submit your company project.')
        } catch (error) {
          console.error('Failed to parse pending data:', error)
        }
      }
    }
  }, [isAuthenticated])

  // Add some demo logs on component mount
  useEffect(() => {
    const demoLogs = [
      { message: "Tesla project created successfully!", status: 'completed' as const, company: 'Tesla' },
      { message: "Microsoft business analysis completed", status: 'completed' as const, company: 'Microsoft' },
      { message: "Apple AI assistant deployed", status: 'completed' as const, company: 'Apple' },
    ]
    
    demoLogs.forEach((log, index) => {
      setTimeout(() => {
        addLog(log.message, log.status, log.company)
      }, index * 1000)
    })
  }, [])

  const handleCompanyChange = (company: string) => {
    setFormData(prev => ({ ...prev, company }))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Walnut AI</h1>
                <p className="text-xs text-muted-foreground">Business Intelligence for Sales & Strategy Teams</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                    <Database className="w-4 h-4 mr-2" />
                    My Projects
                  </Button>
                </Link>
              ) : (
                <Link href="/auth">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                    Sign In
                  </Button>
                </Link>
              )}
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
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Walnut AI
            </span>
            <br />
            Business Intelligence
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transform sales prospecting, M&A analysis, and market research. Get investment-grade company intelligence in 2 minutes, not hours.
          </p>
        </div>

        {/* Creation Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100 p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Research Any Company</h2>
            <p className="text-gray-600">Generate professional business intelligence reports and AI-powered insights for sales, M&A, or market analysis</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="company"
                    placeholder="Apple Inc."
                    value={formData.company}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    className="pl-10 h-12 border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyUrl">Company Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="companyUrl"
                    placeholder="https://apple.com"
                    value={formData.companyUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyUrl: e.target.value }))}
                    className="pl-10 h-12 border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="industry"
                    placeholder="Technology"
                    value={formData.industry}
                    onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                    className="pl-10 h-12 border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hqLocation">Headquarters</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="hqLocation"
                    placeholder="Cupertino, CA"
                    value={formData.hqLocation}
                    onChange={(e) => setFormData(prev => ({ ...prev, hqLocation: e.target.value }))}
                    className="pl-10 h-12 border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-medium text-blue-900 mb-3">Your business intelligence package includes:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 text-sm">Executive Report</p>
                    <p className="text-blue-700 text-xs">Investment-grade analysis</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 text-sm">AI Research Assistant</p>
                    <p className="text-blue-700 text-xs">Deep-dive analysis</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 text-sm">Intelligence Hub</p>
                    <p className="text-blue-700 text-xs">Manage research</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                type="submit"
                disabled={loading || !formData.company.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-12 h-12 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    Generate Intelligence Report
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Activity Logs */}
        {logs.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100 mb-16">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-green-600" />
                <span>Live Activity</span>
                <Badge variant="secondary" className="text-xs">
                  {logs.filter(log => log.status === 'completed').length} completed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 text-sm p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    {log.status === 'pending' && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600 flex-shrink-0" />
                    )}
                    {log.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                    {log.status === 'error' && (
                      <div className="h-4 w-4 rounded-full bg-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className={`block ${log.status === 'error' ? 'text-red-600' : 'text-gray-700'}`}>
                        {log.message}
                      </span>
                      {log.company && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {log.company}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-16">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-blue-100">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Search className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Sales Intelligence</h3>
            <p className="text-sm text-gray-600">Prospect research for sales teams</p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-blue-100">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">M&A Analysis</h3>
            <p className="text-sm text-gray-600">Due diligence and target evaluation</p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-blue-100">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Market Research</h3>
            <p className="text-sm text-gray-600">Competitive intelligence and positioning</p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-blue-100">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Strategic Insights</h3>
            <p className="text-sm text-gray-600">Executive briefings and reporting</p>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Why Business Teams Choose Walnut AI</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900">95% Faster Research</h4>
              <p className="text-gray-600 text-sm">From 4 hours to 2 minutes - transform your sales and strategy workflows</p>
            </div>
            
            <div className="space-y-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Investment-Grade Quality</h4>
              <p className="text-gray-600 text-sm">Professional analysis trusted by VCs, consultants, and Fortune 500 teams</p>
            </div>
            
            <div className="space-y-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Competitive Advantage</h4>
              <p className="text-gray-600 text-sm">Close deals faster, make better investments, win more business</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
