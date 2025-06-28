"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Globe, Database, Upload, FileText, Share2, Loader2, AlertCircle, Building, BarChart3, Plus, File, Type } from "lucide-react"

interface Chatbot {
  $id: string
  namespace: string
  title: string
  description: string
  companyName: string
  domain: string
  industry: string
  pagesCrawled: number
  documentsStored: number
  published: boolean
  publicUrl: string | null
  createdAt: string
  lastUpdated: string
}

interface TrainingLog {
  $id: string
  contentType: string
  title: string
  fileName: string | null
  chunksAdded: number
  contentLength: number
  addedAt: string
}

export default function ChatbotAdminPage() {
    const params = useParams()
    const chatbotId = params.id as string
    
    const [chatbot, setChatbot] = useState<Chatbot | null>(null)
    const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    
    // Training data states
    const [textInput, setTextInput] = useState('')
    const [textTitle, setTextTitle] = useState('')
    const [fileInput, setFileInput] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    
    // Publishing states
    const [isPublishing, setIsPublishing] = useState(false)
    const [publicUrl, setPublicUrl] = useState<string | null>(null)

    useEffect(() => {
        if (chatbotId) {
            fetchChatbotData()
            fetchTrainingLogs()
        }
    }, [chatbotId])

    const fetchChatbotData = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/chatbots/${chatbotId}`)
            if (response.ok) {
                const result = await response.json()
                if (result.success) {
                    setChatbot(result.data)
                    if(result.data.publicUrl) {
                        setPublicUrl(window.location.origin + result.data.publicUrl)
                    }
                } else {
                    setError(result.error || 'Chatbot not found')
                }
            } else if (response.status === 404) {
                setError('Chatbot not found')
                setTimeout(() => {
                    window.location.href = '/dashboard'
                }, 3000)
            } else {
                setError('Failed to fetch chatbot data')
            }
        } catch (e) {
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    const fetchTrainingLogs = async () => {
        try {
            const response = await fetch(`/api/chatbots/${chatbotId}/data`)
            if (response.ok) {
                const result = await response.json()
                if (result.success) {
                    setTrainingLogs(result.data)
                }
            }
        } catch (error) {
            console.error('Failed to fetch training logs:', error)
        }
    }

    const handleTextSubmit = async () => {
        if (!textInput.trim() || !chatbot) return
        setIsSubmitting(true)

        const formData = new FormData()
        formData.append('text', textInput)
        formData.append('title', textTitle || 'Text Training Data')

        try {
            const response = await fetch(`/api/chatbots/${chatbot.namespace}/data`, {
                method: 'POST',
                body: formData
            })
            
            const result = await response.json()
            
            if (response.ok && result.success) {
                setTextInput('')
                setTextTitle('')
                alert(`Successfully added ${result.details.chunksAdded} chunks of training data!`)
                fetchChatbotData() // Refresh chatbot data
                fetchTrainingLogs() // Refresh training logs
            } else {
                alert(result.error || 'Failed to add text content.')
            }
        } catch (e) {
            alert('An error occurred while adding text content.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFileInput(e.target.files[0])
        }
    }

    const handleFileSubmit = async () => {
        if (!fileInput || !chatbot) return
        setIsSubmitting(true)

        const formData = new FormData()
        formData.append('file', fileInput)
        formData.append('title', fileInput.name)

        try {
            const response = await fetch(`/api/chatbots/${chatbot.namespace}/data`, {
                method: 'POST',
                body: formData
            })
            
            const result = await response.json()
            
            if (response.ok && result.success) {
                setFileInput(null)
                // Reset file input
                const fileInputElement = document.getElementById('file-upload') as HTMLInputElement
                if (fileInputElement) fileInputElement.value = ''
                
                alert(`Successfully added ${result.details.chunksAdded} chunks from ${result.details.fileName}!`)
                fetchChatbotData() // Refresh chatbot data
                fetchTrainingLogs() // Refresh training logs
            } else {
                alert(result.error || 'Failed to upload file.')
            }
        } catch (e) {
            alert('An error occurred while uploading the file.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handlePublish = async (publish: boolean) => {
        if (!chatbot) return
        setIsPublishing(true)

        try {
            const response = await fetch(`/api/chatbots/${chatbot.$id}/publish`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ published: publish })
            })

            const result = await response.json()
            
            if(response.ok && result.success) {
                setChatbot({ ...chatbot, published: publish, publicUrl: result.publicUrl })
                if(result.publicUrl) {
                    setPublicUrl(window.location.origin + result.publicUrl)
                } else {
                    setPublicUrl(null)
                }
                alert(result.message)
            } else {
                alert(result.error || 'Failed to update chatbot status.')
            }
        } catch(e) {
            alert('An error occurred while updating publish status.')
        } finally {
            setIsPublishing(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading chatbot admin panel...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <h2 className="text-xl font-semibold mb-2">Error</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                {error === 'Chatbot not found' && (
                    <p className="text-sm text-muted-foreground mb-4">
                        Redirecting to dashboard in 3 seconds...
                    </p>
                )}
                <Link href="/dashboard">
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="bg-card border-b p-3">
                <div className="flex items-center gap-2 max-w-7xl mx-auto">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard">
                            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Building className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-foreground">{chatbot?.title}</h1>
                            <p className="text-sm text-muted-foreground">{chatbot?.domain}</p>
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        {chatbot?.published && publicUrl && (
                            <Button variant="outline" size="sm" asChild>
                                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                                    <Share2 className="w-4 h-4 mr-2" />
                                    View Public
                                </a>
                            </Button>
                        )}
                        <Link href={`/chat?chatbotId=${chatbot?.namespace}`}>
                            <Button size="sm">
                                Test Chat
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-8 px-4">
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="training">Training Data</TabsTrigger>
                        <TabsTrigger value="publish">Publishing</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Pages Crawled</CardTitle>
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{chatbot?.pagesCrawled || 0}</div>
                                    <p className="text-xs text-muted-foreground">From website analysis</p>
                                </CardContent>
                            </Card>
                            
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Documents Stored</CardTitle>
                                    <Database className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{chatbot?.documentsStored || 0}</div>
                                    <p className="text-xs text-muted-foreground">In vector database</p>
                                </CardContent>
                            </Card>
                            
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={chatbot?.published ? "default" : "secondary"}>
                                            {chatbot?.published ? "Published" : "Draft"}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {chatbot?.published ? "Publicly accessible" : "Private only"}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Chatbot Information</CardTitle>
                                <CardDescription>Details about your AI assistant</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Company Name</label>
                                        <p className="text-sm text-muted-foreground">{chatbot?.companyName}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Domain</label>
                                        <p className="text-sm text-muted-foreground">{chatbot?.domain}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Industry</label>
                                        <p className="text-sm text-muted-foreground capitalize">{chatbot?.industry}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Created</label>
                                        <p className="text-sm text-muted-foreground">
                                            {chatbot?.createdAt ? new Date(chatbot.createdAt).toLocaleDateString() : 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Description</label>
                                    <p className="text-sm text-muted-foreground">{chatbot?.description}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="training" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Add Text Content */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Type className="w-5 h-5 text-primary" />
                                        Add Text Content
                                    </CardTitle>
                                    <CardDescription>
                                        Add raw text content to train your chatbot
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium">Title (Optional)</label>
                                        <Input
                                            value={textTitle}
                                            onChange={(e) => setTextTitle(e.target.value)}
                                            placeholder="e.g., Company Policies, FAQ, Product Info"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Content</label>
                                        <Textarea
                                            value={textInput}
                                            onChange={(e) => setTextInput(e.target.value)}
                                            placeholder="Paste your text content here..."
                                            rows={8}
                                            className="mt-1"
                                        />
                                    </div>
                                    <Button 
                                        onClick={handleTextSubmit} 
                                        disabled={!textInput.trim() || isSubmitting}
                                        className="w-full"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Adding Content...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Text Content
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Upload File */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Upload className="w-5 h-5 text-primary" />
                                        Upload File
                                    </CardTitle>
                                    <CardDescription>
                                        Upload PDF or TXT files to train your chatbot
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium">Select File</label>
                                        <Input
                                            id="file-upload"
                                            type="file"
                                            onChange={handleFileChange}
                                            accept=".pdf,.txt"
                                            className="mt-1"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Supported formats: PDF, TXT (Max 10MB)
                                        </p>
                                    </div>
                                    
                                    {fileInput && (
                                        <div className="p-3 bg-muted rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <File className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">{fileInput.name}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Size: {(fileInput.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    )}
                                    
                                    <Button 
                                        onClick={handleFileSubmit} 
                                        disabled={!fileInput || isSubmitting}
                                        className="w-full"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Uploading File...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4 mr-2" />
                                                Upload File
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Training History */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Training History</CardTitle>
                                <CardDescription>
                                    Recent training data additions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {trainingLogs.length > 0 ? (
                                    <div className="space-y-3">
                                        {trainingLogs.map((log) => (
                                            <div key={log.$id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    {log.contentType === 'pdf' ? (
                                                        <File className="w-4 h-4 text-red-500" />
                                                    ) : (
                                                        <Type className="w-4 h-4 text-blue-500" />
                                                    )}
                                                    <div>
                                                        <p className="font-medium">{log.title}</p>
                                                        {log.fileName && (
                                                            <p className="text-sm text-muted-foreground">{log.fileName}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium">{log.chunksAdded} chunks</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(log.addedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-muted-foreground">No training data added yet</p>
                                        <p className="text-sm text-muted-foreground">Add text or upload files to enhance your chatbot</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="publish" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Share2 className="w-5 h-5 text-primary" />
                                    Publishing Settings
                                </CardTitle>
                                <CardDescription>
                                    Make your chatbot publicly accessible
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <h3 className="font-medium">Public Access</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {chatbot?.published 
                                                ? "Your chatbot is publicly accessible" 
                                                : "Your chatbot is private"
                                            }
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={chatbot?.published ? "default" : "secondary"}>
                                            {chatbot?.published ? "Published" : "Draft"}
                                        </Badge>
                                        <Button
                                            onClick={() => handlePublish(!chatbot?.published)}
                                            disabled={isPublishing}
                                            variant={chatbot?.published ? "destructive" : "default"}
                                        >
                                            {isPublishing ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                chatbot?.published ? "Unpublish" : "Publish"
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {chatbot?.published && publicUrl && (
                                    <div className="space-y-3">
                                        <Separator />
                                        <div>
                                            <label className="text-sm font-medium">Public URL</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Input
                                                    value={publicUrl}
                                                    readOnly
                                                    className="font-mono text-sm"
                                                />
                                                <Button
                                                    variant="outline"
                                                    onClick={() => navigator.clipboard.writeText(publicUrl)}
                                                >
                                                    Copy
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    asChild
                                                >
                                                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                                                        <Share2 className="w-4 h-4" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 bg-muted rounded-lg">
                                            <h4 className="font-medium mb-2">Share Your Chatbot</h4>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                Users can access your chatbot at the public URL above. 
                                                The chatbot will respond as {chatbot?.companyName} and provide 
                                                information based on your website content and training data.
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                <Button variant="outline" size="sm" asChild>
                                                    <a 
                                                        href={`https://twitter.com/intent/tweet?text=Check out our AI assistant: ${publicUrl}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        Share on Twitter
                                                    </a>
                                                </Button>
                                                <Button variant="outline" size="sm" asChild>
                                                    <a 
                                                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        Share on LinkedIn
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-primary" />
                                    Analytics & Usage
                                </CardTitle>
                                <CardDescription>
                                    Monitor your chatbot's performance and usage
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8">
                                    <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-muted-foreground">Analytics Coming Soon</p>
                                    <p className="text-sm text-muted-foreground">
                                        Track conversations, user engagement, and performance metrics
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
} 