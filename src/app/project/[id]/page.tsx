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
import Link from 'next/link'
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { EmbeddedChatInterface } from "@/components/chat/embedded-chat-interface"

interface CompanyProject {
  $id: string
  name: string
  url?: string
  description?: string
  type?: string
  companyData?: {
    name: string
    url?: string
    industry?: string
    hqLocation?: string
    researchReport?: string
    companyInfo?: any
    generatedAt?: string
  }
  createdAt: string
  namespace?: string
}

export default function ProjectWorkspace() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [project, setProject] = useState<CompanyProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('research')

  // Handle tab switching from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const tab = urlParams.get('tab')
      if (tab && ['research', 'chat', 'admin'].includes(tab)) {
        setActiveTab(tab)
      }
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    const loadProject = async () => {
      if (!params.id || !isAuthenticated) return

      try {
        setLoading(true)
        const response = await fetch(`/api/chatbots/${params.id}`)
        
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setProject(result.data)
          } else {
            throw new Error('Project not found')
          }
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
  }, [params.id, isAuthenticated, router])

  const handleDownloadReport = () => {
    if (!project?.companyData?.researchReport) return

    const blob = new Blob([project.companyData.researchReport], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.companyData.name || 'company'}-research-report.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Report downloaded successfully')
  }

  if (authLoading || loading) {
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

  const companyData = project.companyData
  const companyInfo = companyData?.companyInfo || {}

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          {/* Header */}
          <div className="border-b border-blue-100 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center px-4 py-4">
              <SidebarTrigger className="mr-4" />
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {companyData?.name || project.name}
                    </h1>
                    <p className="text-sm text-gray-500">
                      {companyData?.industry || 'Company'} • Created {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {companyData?.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(companyData.url, '_blank')}
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
                    disabled={!companyData?.researchReport}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </div>
            </div>
          </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Company Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-sm font-medium">Website</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 truncate">
                {companyData?.url || 'Not provided'}
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
                {companyData?.industry || companyInfo?.industry || 'Not specified'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <CardTitle className="text-sm font-medium">Headquarters</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                {companyData?.hqLocation || companyInfo?.hqLocation || 'Not specified'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-orange-600" />
                <CardTitle className="text-sm font-medium">Founded</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                {companyInfo?.founded || 'Not available'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                      AI-generated analysis of {companyData?.name} including financial data, market position, and insights
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Generated {companyData?.generatedAt ? new Date(companyData.generatedAt).toLocaleDateString() : 'Recently'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {companyData?.researchReport ? (
                  <div className="prose prose-sm max-w-none">
                    <div 
                      className="whitespace-pre-wrap text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: companyData.researchReport
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
                companyName={companyData?.name || project.name}
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
                  Manage your {companyData?.name} project settings and configuration
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
                        <span>{companyData?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Industry:</span>
                        <span>{companyData?.industry || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span>{companyData?.hqLocation || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Research Date:</span>
                        <span>
                          {companyData?.generatedAt 
                            ? new Date(companyData.generatedAt).toLocaleDateString()
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
                      disabled={!companyData?.researchReport}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Report
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Trigger re-research
                        toast.info('Re-research functionality coming soon')
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Update Research
                    </Button>
                  </div>
                </div>
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