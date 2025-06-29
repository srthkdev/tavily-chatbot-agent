"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  name: string
  preferences?: Record<string, unknown>
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async (retryCount = 0) => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Ensure cookies are included
        cache: 'no-store' // Prevent caching issues
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setUser(result.user)
          return
        }
      }
      
      // If we get here, authentication failed
      setUser(null)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      
      // Retry once if it's a network error and this is the first attempt
      if (retryCount === 0 && error instanceof TypeError) {
        console.log('Retrying authentication check...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        return refreshUser(1)
      }
      
      setUser(null)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    })

    const result = await response.json()

    if (!response.ok) {
      // Handle rate limit with a more user-friendly message
      if (response.status === 429) {
        throw new Error('Too many login attempts. Please wait a few minutes and try again.')
      }
      throw new Error(result.error || 'Login failed')
    }

    // Wait a bit longer to ensure cookie is properly set
    await new Promise(resolve => setTimeout(resolve, 500))
    await refreshUser()
  }

  const register = async (email: string, password: string, name: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name })
    })

    const result = await response.json()

    if (!response.ok) {
      // Handle rate limit with a more user-friendly message
      if (response.status === 429) {
        throw new Error('Too many registration attempts. Please wait a few minutes and try again.')
      }
      throw new Error(result.error || 'Registration failed')
    }

    // Wait a bit longer to ensure cookie is properly set
    await new Promise(resolve => setTimeout(resolve, 500))
    await refreshUser()
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
    setUser(null)
  }

  useEffect(() => {
    const initAuth = async () => {
      // Add a small delay to ensure the DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100))
      await refreshUser()
      setIsLoading(false)
    }

    initAuth()
  }, [])

  // Add visibility change listener to refresh auth when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Refresh user data when tab becomes visible to catch session expiry
        refreshUser()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 