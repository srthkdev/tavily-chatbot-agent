'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  Download, 
  ExternalLink,
  Calendar,
  Globe,
  BarChart3,
  Building2
} from 'lucide-react'
import { MarkdownRenderer } from '@/components/chat/markdown-renderer'
import { GenerateResearchButton } from './generate-research-button'

interface CompanyData {
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

interface ResearchReportViewProps {
  companyData?: CompanyData
  projectName: string
  projectId?: string
  projectUrl?: string
  onDownload: () => void
  onGenerateResearch: () => void
  onResearchGenerated?: (data: { researchData: CompanyData }) => void
}

export function ResearchReportView({ 
  companyData, 
  projectName, 
  projectId,
  projectUrl,
  onDownload, 
  onGenerateResearch,
  onResearchGenerated
}: ResearchReportViewProps) {
  
  if (!companyData?.researchReport) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Research Report</span>
          </CardTitle>
          <CardDescription>
            Comprehensive analysis of {companyData?.name || projectName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Research Report</h3>
            <p className="text-gray-500 mb-6">Generate comprehensive research to get started</p>
{projectId ? (
              <GenerateResearchButton
                projectId={projectId}
                projectName={projectName}
                projectUrl={projectUrl}
                onResearchGenerated={onResearchGenerated}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              />
            ) : (
              <Button
                onClick={onGenerateResearch}
                className="bg-blue-500 hover:bg-blue-600 text-white"
                data-generate-research
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate Research Report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Research Report</span>
              </CardTitle>
              <CardDescription>
                Comprehensive analysis of {companyData.name || projectName}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="text-green-600 border-green-200">
                <Calendar className="w-3 h-3 mr-1" />
                {companyData.generatedAt 
                  ? new Date(companyData.generatedAt).toLocaleDateString()
                  : 'Recent'
                }
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={onDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Company Info Summary */}
      {(companyData.url || companyData.industry || companyData.hqLocation) && (
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              <span>Company Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {companyData.url && (
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <a 
                    href={companyData.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm"
                  >
                    {companyData.url.replace(/^https?:\/\//, '')}
                    <ExternalLink className="w-3 h-3 inline ml-1" />
                  </a>
                </div>
              )}
              {companyData.industry && (
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">{companyData.industry}</span>
                </div>
              )}
              {companyData.hqLocation && (
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-gray-700">{companyData.hqLocation}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Report Content */}
      <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
        <CardContent className="p-6">
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer content={companyData.researchReport} />
          </div>
        </CardContent>
      </Card>

      {/* References Section */}
      {companyData.references && companyData.references.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ExternalLink className="w-5 h-5 text-orange-600" />
              <span>References</span>
            </CardTitle>
            <CardDescription>
              Sources and references used in this research report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {companyData.references.map((reference, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          [{index + 1}]
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {reference.domain}
                        </Badge>
                        {reference.score && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                            {Math.round(reference.score * 100)}% relevance
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        {reference.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {reference.url}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(reference.url, '_blank')}
                      className="ml-4"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Research Methodology */}
      <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <span>Research Methodology</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Data Sources</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Real-time web search via Tavily API</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Financial data and market analysis</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Industry reports and news analysis</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Company website and official documents</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Analysis Framework</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Multi-agent research system</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>AI-powered content curation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  <span>Relevance scoring and filtering</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                  <span>Comprehensive report compilation</span>
                </li>
              </ul>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              This report was generated using advanced AI research agents that collect, analyze, and synthesize 
              information from multiple sources to provide comprehensive business intelligence.
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <span>Generated: {companyData.generatedAt 
                ? new Date(companyData.generatedAt).toLocaleString()
                : 'Recently'
              }</span>
              <span>•</span>
              <span>Sources: {companyData.references?.length || 0}</span>
              <span>•</span>
              <span>AI-Powered Analysis</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 