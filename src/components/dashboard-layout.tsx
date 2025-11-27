'use client'

import type React from 'react'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { BudgetCopilot } from '@/components/budget-copilot'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc/client'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const router = useRouter()
  const { data: onboardingStatus } = trpc.user.getOnboardingStep.useQuery()

  // Redirect to onboarding if not onboarded
  useEffect(() => {
    if (onboardingStatus && !onboardingStatus.onboarded) {
      router.replace('/onboarding')
    }
  }, [onboardingStatus, router])

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1">
          <div className="border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="flex h-14 items-center justify-between gap-4 px-4">
              <SidebarTrigger />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsChatOpen(true)}
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">AI Copilot</span>
              </Button>
            </div>
          </div>
          <div className="p-6">{children}</div>
        </main>
        <BudgetCopilot
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      </div>
    </SidebarProvider>
  )
}
