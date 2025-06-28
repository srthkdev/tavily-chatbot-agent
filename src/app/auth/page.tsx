"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkles } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState('login')

  const handleAuthSuccess = async () => {
    // Force refresh user data and add delay for cookie propagation
    setTimeout(async () => {
      await refreshUser()
      
      // Check if there's a pending chatbot creation
      const pendingUrl = localStorage.getItem('pending_chatbot_url')
      if (pendingUrl) {
        localStorage.removeItem('pending_chatbot_url')
        // Redirect back to main page with the URL to continue creation
        router.push(`/?url=${encodeURIComponent(pendingUrl)}`)
      } else {
        // Redirect to dashboard after successful authentication
        router.push('/dashboard')
      }
    }, 500) // 500ms delay to allow cookie propagation and auth context update
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Tavily Chatbot</h1>
          </div>
          <p className="text-muted-foreground">
            Sign in to create and manage your AI chatbots
          </p>
        </div>

        {/* Auth Forms */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <LoginForm 
              onSuccess={handleAuthSuccess}
              onSwitchToRegister={() => setActiveTab('register')}
            />
          </TabsContent>
          
          <TabsContent value="register">
            <RegisterForm 
              onSuccess={handleAuthSuccess}
              onSwitchToLogin={() => setActiveTab('login')}
            />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>
            Powered by{' '}
            <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Tavily Search
            </a>
            {' '}&{' '}
            <a href="https://appwrite.io" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
              Appwrite
            </a>
          </p>
        </div>
      </div>
    </div>
  )
} 