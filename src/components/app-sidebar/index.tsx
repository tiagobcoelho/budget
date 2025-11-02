'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  CreditCard,
  Settings,
  BarChart3,
  Sparkles,
} from 'lucide-react'

import { SearchForm } from '@/components/app-sidebar/search-form'
import { TeamSwitcher } from '@/components/app-sidebar/team-switcher'
import { UserNav } from '@/components/app-sidebar/user-nav'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

// Navigation data for your SaaS
const data = {
  navMain: [
    {
      title: 'Dashboard',
      items: [
        {
          title: 'Overview',
          url: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          title: 'Analytics',
          url: '/dashboard/analytics',
          icon: BarChart3,
        },
      ],
    },
    {
      title: 'Features',
      items: [
        {
          title: 'AI Chat',
          url: '/chat',
          icon: MessageSquare,
        },
        {
          title: 'AI Tools',
          url: '/dashboard/ai-tools',
          icon: Sparkles,
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          title: 'Billing',
          url: '/dashboard/billing',
          icon: CreditCard,
        },
        {
          title: 'Settings',
          url: '/dashboard/settings',
          icon: Settings,
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <TeamSwitcher />
        <SearchForm />
      </SidebarHeader>
      <SidebarContent>
        {/* We create a SidebarGroup for each section. */}
        {data.navMain.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.url

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.url}>
                          <Icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <UserNav />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
