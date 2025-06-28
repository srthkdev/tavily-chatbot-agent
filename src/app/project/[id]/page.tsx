"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { 
  Building2, 
  FileText, 
  MessageSquare, 
  Settings,
  ArrowLeft,
  Globe,
  MapPin,
  Briefcase,
  Calendar,
  Loader2,
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  ExternalLink,
  Download
} from "lucide-react"
import { toast } from "sonner"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { EmbeddedChatInterface } from "@/components/chat/embedded-chat-interface"
import { GenerateResearchButton } from "@/components/research/generate-research-button"
import { useResearchStore } from "@/stores/research-store"

interface CompanyProject {
  $id: string
  name: string
  url?: string
  description?: string
  type?: string
  companyData?: {
    name: string
    url?: string
    industry?: string | null
    hqLocation?: string | null
    researchReport?: string | null
    companyInfo?: Record<string, unknown>
    generatedAt?: string
  }
  createdAt: string
  namespace?: string
}

interface ResearchData {
  name: string
  url?: string
  industry?: string | null
  hqLocation?: string | null
  researchReport?: string | null
  companyInfo?: Record<string, unknown>
  generatedAt?: string
}

export default function ProjectWorkspace() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  
  const [project, setProject] = useState<CompanyProject | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Research store
  const { currentResearch, loadResearch } = useResearchStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth')
      return
    }

    const loadProject = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/chatbots/${params.id}`)
        
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            const chatbotData = result.data
            
            // Create project structure from chatbot data
            const projectData: CompanyProject = {
              $id: chatbotData.$id,
              name: chatbotData.name || chatbotData.title,
              url: chatbotData.url || chatbotData.domain,
              description: chatbotData.description,
              type: 'company_research',
              namespace: chatbotData.namespace,
              createdAt: chatbotData.createdAt,
              companyData: {
                name: chatbotData.name || chatbotData.title,
                url: chatbotData.url || chatbotData.domain,
                industry: null,
                hqLocation: null,
                researchReport: null,
                companyInfo: {},
                generatedAt: chatbotData.createdAt
              }
            }
            setProject(projectData)
            
            // Load research data if available
            if (user) {
              await loadResearch(chatbotData.$id, user.id)
            }
          } else {
            throw new Error('Project not found')
          }
        } else if (response.status === 404) {
          throw new Error('Project not found')
        } else {
          throw new Error('Failed to load project')
        }
      } catch (error) {
        console.error('Failed to load project:', error)
        toast.error('Failed to load project')
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [params.id, isAuthenticated, router, user, loadResearch])

  const handleDownloadReport = () => {
    const reportContent = currentResearch?.researchReport || project?.companyData?.researchReport
    if (!reportContent) {
      toast.error('No research report available')
      return
    }

    const blob = new Blob([reportContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project?.name || 'company'}-research-report.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Report downloaded successfully')
  }

  const handleResearchGenerated = (research: ResearchData) => {
    // Update project with research data
    if (project) {
      setProject({
        ...project,
        companyData: {
          name: research.name || project.name,
          url: research.url || project.url,
          industry: research.industry,
          hqLocation: research.hqLocation,
          researchReport: research.researchReport,
          companyInfo: research.companyInfo,
          generatedAt: research.generatedAt
        }
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading project workspace...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !project) {
    return null
  }

  // Get effective company data (research data takes precedence)
  const effectiveCompanyData = currentResearch ? {
    name: currentResearch.name,
    url: currentResearch.url,
    industry: currentResearch.industry,
    hqLocation: currentResearch.hqLocation,
    researchReport: currentResearch.researchReport,
    companyInfo: currentResearch.companyInfo,
    generatedAt: currentResearch.generatedAt
  } : project?.companyData

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <h1 className="font-semibold">{project?.name}</h1>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 border-b">
          <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"></div>
          <div className="relative px-6 py-8">
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{effectiveCompanyData?.name || project?.name}</h1>
                    <p className="text-gray-600 mt-1">{project?.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {effectiveCompanyData?.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(effectiveCompanyData.url, '_blank')}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visit Website
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadReport}
                    disabled={!effectiveCompanyData?.researchReport}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </Button>
                  <GenerateResearchButton
                    projectId={project?.$id || ''}
                    projectName={project?.name || ''}
                    projectUrl={project?.url || ''}
                    onResearchGenerated={handleResearchGenerated}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-8">
          {/* Company Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-sm font-medium">Website</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground truncate">
                  {effectiveCompanyData?.url || 'Not provided'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                  <CardTitle className="text-sm font-medium">Industry</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {effectiveCompanyData?.industry || 'Not specified'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-green-100">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <CardTitle className="text-sm font-medium">Headquarters</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {effectiveCompanyData?.hqLocation || 'Not specified'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <CardTitle className="text-sm font-medium">Research Date</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {effectiveCompanyData?.generatedAt 
                    ? new Date(effectiveCompanyData.generatedAt).toLocaleDateString()
                    : 'Not generated'
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value="research" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border border-blue-100">
              <TabsTrigger value="research" className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Research Report</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>AI Assistant</span>
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Admin Panel</span>
              </TabsTrigger>
            </TabsList>

            {/* Research Report Tab */}
            <TabsContent value="research" className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span>Comprehensive Research Report</span>
                      </CardTitle>
                      <CardDescription>
                        AI-generated analysis of {effectiveCompanyData?.name} including financial data, market position, and insights
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      Generated {effectiveCompanyData?.generatedAt ? new Date(effectiveCompanyData.generatedAt).toLocaleDateString() : 'Recently'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {effectiveCompanyData?.researchReport ? (
                    <div className="prose prose-sm max-w-none">
                      <div 
                        className="whitespace-pre-wrap text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ 
                          __html: effectiveCompanyData.researchReport
                            .replace(/^# /gm, '<h1 class="text-2xl font-bold text-gray-900 mb-4 mt-6">')
                            .replace(/^## /gm, '<h2 class="text-xl font-semibold text-gray-800 mb-3 mt-5">')
                            .replace(/^### /gm, '<h3 class="text-lg font-medium text-gray-700 mb-2 mt-4">')
                            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
                            .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                            .replace(/^- /gm, '• ')
                            .replace(/\n\n/g, '</p><p class="mb-4">')
                            .replace(/^/, '<p class="mb-4">')
                            .replace(/$/, '</p>')
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No research report available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Assistant Tab */}
            <TabsContent value="chat" className="space-y-6">
              <div className="h-[600px]">
                <EmbeddedChatInterface 
                  companyName={effectiveCompanyData?.name || project?.name}
                  chatbotId={project.$id}
                  namespace={project.namespace}
                  className="h-full"
                />
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <CardTitle className="text-sm font-medium">Financial Data</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-600">
                      Revenue, funding, and financial metrics available in chat
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <CardTitle className="text-sm font-medium">Market Analysis</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-600">
                      Industry trends and competitive positioning insights
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <CardTitle className="text-sm font-medium">Company Intel</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-600">
                      Leadership, culture, and operational information
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Admin Panel Tab */}
            <TabsContent value="admin" className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-gray-600" />
                    <span>Project Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Manage your {effectiveCompanyData?.name} project settings and configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Project Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Project Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Project ID:</span>
                          <span className="font-mono text-xs">{project.$id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Namespace:</span>
                          <span className="font-mono text-xs">{project.namespace}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created:</span>
                          <span>{new Date(project.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <Badge variant="outline">{project.type || 'standard'}</Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Company Data</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Company:</span>
                          <span>{effectiveCompanyData?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Industry:</span>
                          <span>{effectiveCompanyData?.industry || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Location:</span>
                          <span>{effectiveCompanyData?.hqLocation || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Research Date:</span>
                          <span>
                            {effectiveCompanyData?.generatedAt 
                              ? new Date(effectiveCompanyData.generatedAt).toLocaleDateString()
                              : 'N/A'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t pt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Actions</h4>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/${project.$id}`)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Advanced Settings
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadReport}
                        disabled={!effectiveCompanyData?.researchReport}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            toast.info('Generating comprehensive research report...')
                            const response = await fetch(`/api/projects/${project.$id}/research`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                company: effectiveCompanyData?.name || project.name,
                                companyUrl: effectiveCompanyData?.url || project.url,
                                industry: effectiveCompanyData?.industry,
                                hqLocation: effectiveCompanyData?.hqLocation
                              })
                            })
                            
                            if (response.ok) {
                              const result = await response.json()
                              if (result.success) {
                                // Update project with new research data
                                setProject(prev => prev ? {
                                  ...prev,
                                  companyData: {
                                    ...prev.companyData,
                                    ...result.data.researchData
                                  }
                                } : null)
                                toast.success('Research report generated successfully!')
                              } else {
                                toast.error('Failed to generate research report')
                              }
                            } else {
                              toast.error('Failed to generate research report')
                            }
                          } catch (error) {
                            console.error('Research generation error:', error)
                            toast.error('Failed to generate research report')
                          }
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Generate Research
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 