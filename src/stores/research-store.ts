import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ResearchData {
  $id?: string
  chatbotId: string
  userId: string
  name: string
  url: string
  industry?: string
  hqLocation?: string
  researchReport: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  companyInfo: any
  generatedAt: string
  createdAt?: string
  updatedAt?: string
  references?: Array<{
    url: string
    title: string
    domain: string
    score?: number
  }>
}

interface ResearchState {
  // Current research data
  currentResearch: ResearchData | null
  
  // Research generation state
  isGenerating: boolean
  generationProgress: number
  generationStatus: string
  
  // Research list
  researchList: ResearchData[]
  
  // Actions
  setCurrentResearch: (research: ResearchData | null) => void
  setGenerating: (isGenerating: boolean) => void
  setGenerationProgress: (progress: number) => void
  setGenerationStatus: (status: string) => void
  addResearch: (research: ResearchData) => void
  updateResearch: (id: string, updates: Partial<ResearchData>) => void
  removeResearch: (id: string) => void
  setResearchList: (list: ResearchData[]) => void
  
  // Async actions
  generateResearch: (projectId: string, data: {
    company: string
    companyUrl: string
    industry?: string
    hqLocation?: string
  }) => Promise<ResearchData | null>
  
  loadResearch: (projectId: string, userId: string) => Promise<ResearchData | null>
}

export const useResearchStore = create<ResearchState>()(
  persist(
    (set, get) => ({
      currentResearch: null,
      isGenerating: false,
      generationProgress: 0,
      generationStatus: '',
      researchList: [],
      
      setCurrentResearch: (research) => set({ currentResearch: research }),
      setGenerating: (isGenerating) => set({ isGenerating }),
      setGenerationProgress: (progress) => set({ generationProgress: progress }),
      setGenerationStatus: (status) => set({ generationStatus: status }),
      
      addResearch: (research) => set((state) => ({
        researchList: [research, ...state.researchList.filter(r => r.chatbotId !== research.chatbotId)]
      })),
      
      updateResearch: (id, updates) => set((state) => ({
        researchList: state.researchList.map(r => 
          r.$id === id ? { ...r, ...updates } : r
        ),
        currentResearch: state.currentResearch?.$id === id 
          ? { ...state.currentResearch, ...updates }
          : state.currentResearch
      })),
      
      removeResearch: (id) => set((state) => ({
        researchList: state.researchList.filter(r => r.$id !== id),
        currentResearch: state.currentResearch?.$id === id ? null : state.currentResearch
      })),
      
      setResearchList: (list) => set({ researchList: list }),
      
      generateResearch: async (projectId, data) => {
        set({ isGenerating: true, generationProgress: 0, generationStatus: 'Starting research...' })
        
        try {
          const response = await fetch(`/api/projects/${projectId}/research`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
          
          if (!response.ok) {
            throw new Error('Failed to generate research')
          }
          
          const result = await response.json()
          
          if (result.success && result.data.researchData) {
            const research = result.data.researchData
            get().addResearch(research)
            get().setCurrentResearch(research)
            return research
          }
          
          throw new Error(result.error || 'Failed to generate research')
          
        } catch (error) {
          console.error('Research generation error:', error)
          set({ generationStatus: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` })
          return null
        } finally {
          set({ isGenerating: false, generationProgress: 100 })
        }
      },
      
      loadResearch: async (projectId, userId) => {
        try {
          const response = await fetch(`/api/projects/${projectId}/research`)
          
          if (!response.ok) {
            if (response.status === 404) {
              return null // No research found
            }
            throw new Error('Failed to load research')
          }
          
          const result = await response.json()
          
          if (result.success && result.data.companyData) {
            const research: ResearchData = {
              chatbotId: projectId,
              userId,
              name: result.data.companyData.name,
              url: result.data.companyData.url,
              industry: result.data.companyData.industry,
              hqLocation: result.data.companyData.hqLocation,
              researchReport: result.data.companyData.researchReport || '',
              companyInfo: result.data.companyData.companyInfo || {},
              generatedAt: result.data.companyData.generatedAt
            }
            
            get().setCurrentResearch(research)
            return research
          }
          
          return null
          
        } catch (error) {
          console.error('Research loading error:', error)
          return null
        }
      }
    }),
    {
      name: 'research-store',
      partialize: (state) => ({
        researchList: state.researchList,
        currentResearch: state.currentResearch
      })
    }
  )
) 