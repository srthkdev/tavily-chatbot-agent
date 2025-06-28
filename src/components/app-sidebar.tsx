"use client"

import * as React from "react"
import {
  Building2,
  Home,
  Plus,
  Settings,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [projects, setProjects] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const { isAuthenticated } = useAuth()

  // Load projects from database
  React.useEffect(() => {
    const loadProjects = async () => {
      if (!isAuthenticated) return
      
      try {
        setLoading(true)
        const response = await fetch('/api/projects')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            // Transform projects to match expected format
            const transformedProjects = result.data.map((project: any) => ({
              id: project.$id,
              name: project.name,
              url: `/project/${project.$id}`,
              icon: Building2,
            }))
            setProjects(transformedProjects)
          }
        }
      } catch (error) {
        console.error('Failed to load projects:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [isAuthenticated])

  return (
    <Sidebar
      className="border-r"
      {...props}
    >
      <SidebarHeader className="border-b">
        <div className="px-4 py-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="/" className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-500 text-white flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Building2 className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Walnut AI</span>
                    <span className="truncate text-xs text-muted-foreground">Business Intelligence</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="mb-6 space-y-1">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/dashboard" className="flex items-center gap-2">
                    <Home className="size-4" />
                    <span>Dashboard</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/" className="flex items-center gap-2">
                    <Plus className="size-4" />
                    <span>Create Project</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/settings" className="flex items-center gap-2">
                    <Settings className="size-4" />
                    <span>Settings</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
          {!loading && <NavProjects projects={projects} />}
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t px-3 py-2">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
