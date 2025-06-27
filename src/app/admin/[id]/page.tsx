"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Globe, Database, Upload, FileText, Share2, Loader2, AlertCircle } from "lucide-react"

export default function ChatbotAdminPage() {
    const params = useParams()
    const chatbotId = params.id as string
    
    const [chatbot, setChatbot] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [textInput, setTextInput] = useState('')
    const [fileInput, setFileInput] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isPublishing, setIsPublishing] = useState(false)
    const [publicUrl, setPublicUrl] = useState<string | null>(null)

    useEffect(() => {
        if (chatbotId) {
            const fetchChatbot = async () => {
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
                    } else {
                        setError('Failed to fetch chatbot data')
                    }
                } catch (e) {
                    setError('An unexpected error occurred')
                } finally {
                    setLoading(false)
                }
            }
            fetchChatbot()
        }
    }, [chatbotId])

    const handleTextSubmit = async () => {
        if (!textInput.trim() || !chatbot) return
        setIsSubmitting(true)

        const formData = new FormData()
        formData.append('text', textInput)

        try {
            const response = await fetch(`/api/chatbots/${chatbot.namespace}/data`, {
                method: 'POST',
                body: formData
            })
            if (response.ok) {
                setTextInput('')
                alert('Text content added successfully!')
            } else {
                alert('Failed to add text content.')
            }
        } catch (e) {
            alert('An error occurred.')
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

        try {
            const response = await fetch(`/api/chatbots/${chatbot.namespace}/data`, {
                method: 'POST',
                body: formData
            })
            if (response.ok) {
                setFileInput(null)
                alert('File uploaded successfully!')
            } else {
                alert('Failed to upload file.')
            }
        } catch (e) {
            alert('An error occurred.')
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

            if(response.ok) {
                const result = await response.json()
                if (result.success) {
                    setChatbot({ ...chatbot, published: publish, publicUrl: result.publicUrl })
                    if(result.publicUrl) {
                        setPublicUrl(window.location.origin + result.publicUrl)
                    } else {
                        setPublicUrl(null)
                    }
                    alert(`Chatbot ${publish ? 'published' : 'unpublished'} successfully!`)
                }
            } else {
                alert('Failed to update chatbot status.')
            }
        } catch(e) {
            alert('An error occurred.')
        } finally {
            setIsPublishing(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <h2 className="text-xl font-semibold mb-2">Error</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
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
                <div className="flex items-center gap-2 max-w-5xl mx-auto">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard">
                            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                        </Link>
                    </Button>
                    <h1 className="text-md font-semibold truncate text-foreground">{chatbot?.name || 'Manage Chatbot'}</h1>
                </div>
            </header>

            <main className="max-w-5xl mx-auto py-8 px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Chatbot Info & Publishing */}
                    <div className="md:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-primary" />
                                    Chatbot Details
                                </CardTitle>
                                <CardDescription>Information about your chatbot.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-sm font-medium">Name: <span className="font-normal text-muted-foreground">{chatbot.name}</span></p>
                                <p className="text-sm font-medium">URL: <span className="font-normal text-muted-foreground truncate">{chatbot.url}</span></p>
                                <p className="text-sm font-medium">Namespace: <span className="font-normal text-muted-foreground">{chatbot.namespace}</span></p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Share2 className="w-5 h-5 text-primary" />
                                    Publish & Share
                                </CardTitle>
                                <CardDescription>Share your chatbot with a public link.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {chatbot.published && publicUrl ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 p-2 border rounded-md bg-input">
                                            <input type="text" readOnly value={publicUrl} className="flex-1 bg-transparent text-sm truncate" />
                                            <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(publicUrl)}>Copy</Button>
                                        </div>
                                        <Button className="w-full" onClick={() => handlePublish(false)} disabled={isPublishing}>
                                            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unpublish'}
                                        </Button>
                                    </div>
                                ) : (
                                    <Button className="w-full" onClick={() => handlePublish(true)} disabled={isPublishing}>
                                        {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish'}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Data Sources */}
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Database className="w-5 h-5 text-primary" />
                                    Data Sources
                                </CardTitle>
                                <CardDescription>Add more data to refine your chatbot.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Add Text Content</h4>
                                    <textarea
                                        placeholder="Paste raw text here..."
                                        className="w-full p-2 border rounded-md bg-input"
                                        rows={5}
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <Button size="sm" className="mt-2" onClick={handleTextSubmit} disabled={isSubmitting || !textInput.trim()}>
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Text'}
                                    </Button>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Upload className="w-4 h-4" /> Upload Files</h4>
                                    <div className="border-2 border-dashed rounded-md p-6 text-center bg-input">
                                        <Input
                                            type="file"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="file-upload"
                                            disabled={isSubmitting}
                                        />
                                        <label htmlFor="file-upload" className="cursor-pointer">
                                            <p className="text-muted-foreground">{fileInput ? fileInput.name : 'Drag & drop files here, or click to select'}</p>
                                        </label>
                                        <Button size="sm" className="mt-2" onClick={handleFileSubmit} disabled={isSubmitting || !fileInput}>
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload File'}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
} 