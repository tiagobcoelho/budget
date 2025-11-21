'use client'
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Tag,
  BarChart3,
  Settings,
  TrendingUp,
  ChevronRight,
  CreditCard,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
  useSidebar,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { trpc } from '@/lib/trpc/client'
import { formatPeriodLabel } from '@/lib/budget/period'
import { cn } from '@/lib/utils'

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

export function AppSidebar() {
  const pathname = usePathname()

  // Fetch latest reports (limit to 5)
  const { data: reports = [] } = trpc.report.list.useQuery({})
  const latestReports = reports.slice(0, 5).map((report) => ({
    id: report.id,
    title: formatPeriodLabel(new Date(report.startDate)),
    href: `/reports/${report.id}`,
  }))

  const { open, setOpen } = useSidebar()

  return (
    <Sidebar
      collapsible="icon"
      onClick={() => !open && setOpen(true)}
      className={cn('group/sidebar', !open && 'cursor-e-resize')}
    >
      <SidebarHeader
        className={cn(
          'border-b border-sidebar-border flex flex-row items-center justify-between',
          open && 'p-4'
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <div
            className={cn(
              'flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground ',
              !open && 'group-hover/sidebar:hidden'
            )}
          >
            <TrendingUp className="size-4" />
          </div>
          {open && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Budget Planner</span>
              <span className="text-xs text-muted-foreground">
                Track your finances
              </span>
            </div>
          )}
        </Link>
        <div
          className={cn(
            ' ',
            !open &&
              'hidden group-hover/sidebar:flex size-8 items-center justify-center'
          )}
        >
          <SidebarTrigger
            className={cn(
              '',
              !open && 'hidden group-hover/sidebar:block size-4'
            )}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overviewItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
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
                      tooltip="Reports"
                    >
                      <BarChart3 className="size-4" />
                      <span>Reports</span>
                      <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
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
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/settings'}
              tooltip="Settings"
            >
              <Link href="/settings">
                <Settings className="size-4" />
                <span>Account Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
