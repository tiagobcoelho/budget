'use client'
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Tag,
  BarChart3,
  Settings,
  TrendingUp,
  Sun,
  Moon,
  ChevronRight,
  CreditCard,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

const overviewItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
]

const managementItems = [
  {
    title: 'Transactions',
    href: '/transactions',
    icon: Receipt,
  },
  {
    title: 'Budgets',
    href: '/budgets',
    icon: Wallet,
  },
  {
    title: 'Categories',
    href: '/categories',
    icon: Tag,
  },
  {
    title: 'Accounts',
    href: '/accounts',
    icon: CreditCard,
  },
]

const latestReports = [
  { id: 'jan-2024', title: 'January 2024', href: '/reports/jan-2024' },
  { id: 'dec-2023', title: 'December 2023', href: '/reports/dec-2023' },
  { id: 'nov-2023', title: 'November 2023', href: '/reports/nov-2023' },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light')
    setTheme(initialTheme)
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')
  }, [])

  const setLightTheme = () => {
    setTheme('light')
    localStorage.setItem('theme', 'light')
    document.documentElement.classList.remove('dark')
  }

  const setDarkTheme = () => {
    setTheme('dark')
    localStorage.setItem('theme', 'dark')
    document.documentElement.classList.add('dark')
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Budget Planner</span>
            <span className="text-xs text-muted-foreground">
              Track your finances
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overviewItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <item.icon className="size-4" />
                    <Link href={item.href}>
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <Collapsible defaultOpen={true} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={pathname.startsWith('/reports')}
                    >
                      <BarChart3 className="size-4" />
                      <span>Reports</span>
                      <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === '/reports'}
                        >
                          <Link href="/reports">
                            <span>All Reports</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      {latestReports.map((report) => (
                        <SidebarMenuSubItem key={report.id}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === report.href}
                          >
                            <Link href={report.href}>
                              <span>{report.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <item.icon className="size-4" />
                    <Link href={item.href}>
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between">
          <Link
            href="/settings"
            className="flex items-center justify-center size-9 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            <Settings className="size-4 text-muted-foreground" />
          </Link>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={setLightTheme}
              className={`size-9 ${mounted && theme === 'light' ? 'bg-sidebar-accent' : ''}`}
              aria-label="Light theme"
            >
              <Sun className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={setDarkTheme}
              className={`size-9 ${mounted && theme === 'dark' ? 'bg-sidebar-accent' : ''}`}
              aria-label="Dark theme"
            >
              <Moon className="size-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
