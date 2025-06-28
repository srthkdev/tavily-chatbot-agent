"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  FileText
} from "lucide-react"
import { toast } from "sonner"

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
      
      toast.success(`${formData.company} project created successfully!`)
      
      // Clear localStorage
      localStorage.removeItem('pending_company_project')

      // Navigate to the project workspace
      router.push(`/project/${chatbotResult.chatbot.$id}`)

    } catch (error) {
      console.error('Error creating company project:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create company project')
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
                <h1 className="text-xl font-bold text-foreground">Company Research AI</h1>
                <p className="text-xs text-muted-foreground">Comprehensive Business Intelligence Platform</p>
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
            Get comprehensive business intelligence, financial insights, and an AI assistant for any company in minutes.
          </p>
        </div>

        {/* Creation Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100 p-8 mb-16">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Company Project</h2>
            <p className="text-gray-600">Enter company details to generate comprehensive research and AI assistant</p>
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
              <h4 className="font-medium text-blue-900 mb-3">Your project will include:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 text-sm">Research Report</p>
                    <p className="text-blue-700 text-xs">Comprehensive analysis</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 text-sm">AI Chatbot</p>
                    <p className="text-blue-700 text-xs">Company assistant</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 text-sm">Admin Panel</p>
                    <p className="text-blue-700 text-xs">Manage & configure</p>
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
                    Create Project
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-16">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-blue-100">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Search className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Deep Research</h3>
            <p className="text-sm text-gray-600">Comprehensive company analysis with Tavily AI</p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-blue-100">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Financial Insights</h3>
            <p className="text-sm text-gray-600">Revenue, funding, and market analysis</p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-blue-100">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI Assistant</h3>
            <p className="text-sm text-gray-600">Chat with company-specific AI agent</p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-blue-100">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Live Updates</h3>
            <p className="text-sm text-gray-600">Real-time news and market data</p>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Why Choose Our Platform?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Lightning Fast</h4>
              <p className="text-gray-600 text-sm">Get comprehensive company research in under 2 minutes</p>
            </div>
            
            <div className="space-y-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Expert Quality</h4>
              <p className="text-gray-600 text-sm">Professional-grade analysis powered by advanced AI</p>
            </div>
            
            <div className="space-y-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Always Updated</h4>
              <p className="text-gray-600 text-sm">Real-time data and continuous market monitoring</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
