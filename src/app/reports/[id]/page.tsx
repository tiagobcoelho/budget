'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { ReportDetails } from '@/components/reports/report-details'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function ReportDetailPage() {
  const params = useParams()
  const reportId = params.id as string

  const { data: report, isLoading } = trpc.report.getById.useQuery(
    { id: reportId },
    {
      enabled: !!reportId,
      refetchInterval: (query) => {
        // Poll every 2 seconds if report is generating
        const data = query.state.data
        if (data?.status === 'GENERATING') {
          return 2000
        }
        return false
      },
    }
  )

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading report...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!report) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-muted-foreground">Report not found</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Determine report type and title
  const isWeeklyReport = report.period === 'WEEKLY'
  const isInitial = report.isInitial === true
  const reportTitle = isInitial
    ? 'Initial Report'
    : isWeeklyReport
      ? 'Weekly Report'
      : 'Monthly Report'

  // Format subtitle
  const subtitle = isWeeklyReport
    ? `${new Date(report.startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} - ${new Date(report.endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
    : new Date(report.startDate).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header matching prototype */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/reports">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {reportTitle}
              </h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </div>

        <ReportDetails report={report} />
      </div>
    </DashboardLayout>
  )
}
