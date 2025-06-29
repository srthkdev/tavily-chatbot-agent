"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { 
  Building2, 
  FileText, 
  ArrowLeft,
  Globe,
  Briefcase,
  Calendar,
  Loader2,
  TrendingUp,
  ExternalLink,
  Download,
  Bot,
  Sparkles,
  GitCompare,
  Database
} from "lucide-react"
import { toast } from "sonner"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { GenerateResearchButton } from "@/components/research/generate-research-button"
import { useResearchStore } from "@/stores/research-store"
import { ComparisonView } from "@/components/comparison/comparison-view"
import { AIChatInterface } from "@/components/chat/ai-chat-interface"
import { ResearchReportView } from "@/components/research/research-report-view"

interface CompanyProject {
  $id: string
  name: string
  url?: string
  description?: string
  type?: string
  namespace?: string
  pagesCrawled?: number
  documentsStored?: number
  companyData?: {
    name: string
    url?: string
    industry?: string | null
    hqLocation?: string | null
    researchReport?: string | null
    companyInfo?: Record<string, unknown>
    generatedAt?: string
    references?: Array<{
      url: string
      title: string
      domain: string
      score?: number
    }>
  }
  createdAt: string
}

export default function ProjectWorkspace() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  
  const [project, setProject] = useState<CompanyProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Research store
  const { currentResearch, setCurrentResearch } = useResearchStore()

  const loadProject = useCallback(async () => {
    try {
      setLoading(true)
      
      // First try to get the project directly from projects API
      let response = await fetch(`/api/projects/${params.id}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setProject(result.data)
          
          // Load research data if available
          if (user && result.data.companyData?.researchReport) {
            const researchData = {
              $id: result.data.$id,
              chatbotId: result.data.$id,
              userId: user.id,
              name: result.data.companyData.name,
              url: result.data.companyData.url,
              industry: result.data.companyData.industry,
              hqLocation: result.data.companyData.hqLocation,
              researchReport: result.data.companyData.researchReport,
              companyInfo: result.data.companyData.companyInfo || {},
              generatedAt: result.data.companyData.generatedAt,
              references: result.data.companyData.references || []
            }
            setCurrentResearch(researchData)
          }
          return
        }
      }
      
      // If not found in projects, try chatbots API
      response = await fetch(`/api/chatbots/${params.id}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Convert chatbot to project format
          const projectData = {
            $id: result.data.$id,
            name: result.data.name,
            url: result.data.url || '',
            description: result.data.description || '',
            type: 'company_research' as const,
            namespace: result.data.namespace,
            createdAt: result.data.createdAt,
            companyData: {
              name: result.data.name,
              url: result.data.url || '',
              industry: null,
              hqLocation: null,
              researchReport: null,
              companyInfo: {},
              generatedAt: result.data.createdAt,
              references: []
            }
          }
          setProject(projectData)
          return
        }
      }
      
      // If neither found, redirect to dashboard
      router.push('/dashboard')
      
    } catch (error) {
      console.error('Error loading project:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [params.id, router, user, setCurrentResearch])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth')
      return
    }

    loadProject()
  }, [isAuthenticated, loadProject, router])

  const handleResearchGenerated = async () => {
    // Reload the project to get updated data
    await loadProject()
    
    // Switch to research tab to show the new research
    setActiveTab('research')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Project not found</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SidebarTrigger />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="text-xs">
                  {project.type || 'Company Research'}
                </Badge>
                {project.namespace && (
                  <Badge variant="outline" className="text-xs">
                    {project.namespace}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6">
            {/* Project Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Building2 className="w-8 h-8 text-blue-600" />
                    <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                  </div>
                  {project.description && (
                    <p className="text-gray-600 text-lg mb-4">{project.description}</p>
                  )}
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    {project.url && (
                      <div className="flex items-center space-x-1">
                        <Globe className="w-4 h-4" />
                        <a 
                          href={project.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 transition-colors"
                        >
                          {new URL(project.url).hostname}
                        </a>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                    {project.pagesCrawled !== undefined && (
                      <div className="flex items-center space-x-1">
                        <FileText className="w-4 h-4" />
                        <span>{project.pagesCrawled} pages crawled</span>
                      </div>
                    )}
                    {project.documentsStored !== undefined && (
                      <div className="flex items-center space-x-1">
                        <Database className="w-4 h-4" />
                        <span>{project.documentsStored} documents stored</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger value="research" className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Research Report</span>
                </TabsTrigger>
                <TabsTrigger value="comparison" className="flex items-center space-x-2">
                  <GitCompare className="w-4 h-4" />
                  <span>Comparison</span>
                </TabsTrigger>
                <TabsTrigger value="ai-assistant" className="flex items-center space-x-2">
                  <Bot className="w-4 h-4" />
                  <span>AI Assistant</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pages Crawled</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{project.pagesCrawled || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        Website content processed
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Documents Stored</CardTitle>
                      <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{project.documentsStored || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        Vector database entries
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Research Status</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {currentResearch?.researchReport ? 'Complete' : 'Pending'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Company analysis report
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">Ready</div>
                      <p className="text-xs text-muted-foreground">
                        RAG-powered chat available
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                        <span>Project Details</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Company Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Name:</span>
                            <span className="font-medium">{project.name}</span>
                          </div>
                          {project.url && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Website:</span>
                              <a 
                                href={project.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {new URL(project.url).hostname}
                              </a>
                            </div>
                          )}
                          {project.companyData?.industry && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Industry:</span>
                              <span className="font-medium">{project.companyData.industry}</span>
                            </div>
                          )}
                          {project.companyData?.hqLocation && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Location:</span>
                              <span className="font-medium">{project.companyData.hqLocation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Crawl More Pages Section */}
                      <div className="pt-4 border-t">
                        <h4 className="font-medium text-gray-900 mb-3">Expand Knowledge Base</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Current pages crawled:</span>
                            <span className="font-medium">{project.pagesCrawled || 0}</span>
                          </div>
                          <Button
                            onClick={() => {
                              // TODO: Implement crawl more pages functionality
                              toast.info('Crawl more pages feature coming soon')
                            }}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <Globe className="w-4 h-4 mr-2" />
                            Crawl More Pages
                          </Button>
                          <p className="text-xs text-gray-500">
                            Add more pages from {project.url ? new URL(project.url).hostname : 'the website'} to improve AI responses
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <span>AI Capabilities</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">RAG Search</span>
                          <Badge variant="secondary" className="text-xs">
                            {project.documentsStored ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Memory (Mem0)</span>
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Web Search (Tavily)</span>
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">GPT-4.1</span>
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        </div>
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            The AI assistant can answer questions about {project.name} using the {project.documentsStored || 0} crawled documents, 
                            real-time web search, and conversation memory.
                          </p>
                        </div>
                        
                        {/* Performance Metrics */}
                        <div className="pt-4 border-t">
                          <h5 className="font-medium text-gray-900 mb-2">Performance</h5>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Response Quality:</span>
                              <span className="text-green-600 font-medium">
                                {(project.documentsStored || 0) > 0 ? 'High' : 'Standard'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Context Awareness:</span>
                              <span className="text-green-600 font-medium">
                                {(project.documentsStored || 0) > 5 ? 'Excellent' : 'Good'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Cache Status:</span>
                              <span className="text-blue-600 font-medium">Active</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-green-600" />
                        <span>Research Report</span>
                      </div>
                      <GenerateResearchButton 
                        projectId={project.$id}
                        projectName={project.name}
                        projectUrl={project.url}
                        onResearchGenerated={handleResearchGenerated}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentResearch?.researchReport ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          Comprehensive research report generated on {' '}
                          {currentResearch.generatedAt ? 
                            new Date(currentResearch.generatedAt).toLocaleDateString() : 
                            'Unknown date'
                          }
                        </p>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setActiveTab('research')}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            View Report
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // Download functionality could be added here
                              toast.info('Download feature coming soon')
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">No research report generated yet</p>
                        <p className="text-sm text-gray-500">
                          Generate a comprehensive research report to get detailed insights about {project.name}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Research Report Tab */}
              <TabsContent value="research">
                <ResearchReportView 
                  companyData={currentResearch ? {
                    name: currentResearch.name,
                    url: currentResearch.url,
                    industry: currentResearch.industry,
                    hqLocation: currentResearch.hqLocation,
                    researchReport: currentResearch.researchReport,
                    companyInfo: currentResearch.companyInfo,
                    generatedAt: currentResearch.generatedAt,
                    references: currentResearch.references
                  } : undefined}
                  projectName={project.name}
                  projectId={project.$id}
                  projectUrl={project.url}
                  onDownload={() => {
                    const reportContent = currentResearch?.researchReport
                    if (!reportContent) {
                      toast.error('No research report available')
                      return
                    }
                    const blob = new Blob([reportContent], { type: 'text/markdown' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${project.name}-research-report.md`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                    toast.success('Report downloaded successfully')
                  }}
                  onGenerateResearch={() => {
                    // This will trigger the generate research dialog
                    // The actual generation happens in the GenerateResearchButton component
                  }}
                  onResearchGenerated={handleResearchGenerated}
                />
              </TabsContent>

              {/* Comparison Tab */}
              <TabsContent value="comparison">
                <ComparisonView
                  companyName={project.name}
                  companyData={currentResearch ? {
                    name: currentResearch.name,
                    url: currentResearch.url,
                    industry: currentResearch.industry,
                    hqLocation: currentResearch.hqLocation,
                    researchReport: currentResearch.researchReport,
                    companyInfo: currentResearch.companyInfo,
                    generatedAt: currentResearch.generatedAt
                  } : undefined}
                />
              </TabsContent>

              {/* AI Assistant Tab */}
              <TabsContent value="ai-assistant">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Bot className="w-5 h-5 text-blue-600" />
                      <span>{project.name} AI Assistant</span>
                    </CardTitle>
                    <CardDescription>
                      Powered by RAG search over {project.documentsStored || 0} crawled documents, 
                      Mem0 memory, Tavily web search, and GPT-4.1
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <AIChatInterface
                      chatbotId={project.$id}
                      companyName={project.name}
                      namespace={project.namespace}
                      companyData={project.companyData}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 