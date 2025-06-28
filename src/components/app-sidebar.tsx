"use client"

import * as React from "react"
import {
  Building2,
  FileText,
  MessageSquare,
  Settings2,
  Home,
  Database,
  LifeBuoy,
  Send,
  Plus,
  Search,
  BarChart3,
  Command,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter, usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
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

const data = {
  user: {
    name: "User",
    email: "user@example.com",
    avatar: "/avatars/user.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
      items: [
        {
          title: "All Projects",
          url: "/dashboard",
        },
        {
          title: "Recent",
          url: "/dashboard?filter=recent",
        },
        {
          title: "Favorites",
          url: "/dashboard?filter=favorites",
        },
      ],
    },
    {
      title: "Create Project",
      url: "/",
      icon: Plus,
      items: [
        {
          title: "Company Research",
          url: "/",
        },
        {
          title: "Website Chatbot",
          url: "/create-website",
        },
      ],
    },
    {
      title: "Research Tools",
      url: "#",
      icon: Search,
      items: [
        {
          title: "Company Analysis",
          url: "/tools/company-analysis",
        },
        {
          title: "Market Research",
          url: "/tools/market-research",
        },
        {
          title: "Financial Data",
          url: "/tools/financial-data",
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "/settings",
        },
        {
          title: "API Keys",
          url: "/settings/api-keys",
        },
        {
          title: "Billing",
          url: "/settings/billing",
        },
        {
          title: "Team",
          url: "/settings/team",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "/support",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "/feedback",
      icon: Send,
    },
  ],
  projects: [
    {
      name: "Apple Inc.",
      url: "/project/apple-inc",
      icon: Building2,
    },
    {
      name: "Microsoft Corp.",
      url: "/project/microsoft-corp",
      icon: Building2,
    },
    {
      name: "Google LLC",
      url: "/project/google-llc",
      icon: Building2,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
                    <span className="truncate font-medium">Company Research AI</span>
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
          <NavMain items={data.navMain} />
          <NavProjects projects={data.projects} />
        </div>
        <div className="px-3 py-2 border-t">
          <NavSecondary items={data.navSecondary} />
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t px-3 py-2">
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
