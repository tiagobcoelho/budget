'use client'

import { Card, CardContent } from '@/components/ui/card'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { WeeklyReport } from './weekly-report'
import { MonthlyReport } from './monthly-report'
import { InitialReport } from './initial-report'
import { ReportGeneratingState } from './report-generating-state'
import type { TypedReport } from '@/services/report.service'

interface ReportDetailsProps {
  report: TypedReport
}

export function ReportDetails({ report }: ReportDetailsProps) {
  const utils = trpc.useUtils()

  const approveSuggestion = trpc.report.approveBudgetSuggestion.useMutation({
    onSuccess: () => {
      toast.success('Budget suggestion approved')
      utils.budget.list.invalidate()
      utils.report.getById.invalidate({ id: report?.id ?? '' })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to approve suggestion')
    },
  })

  const rejectSuggestion = trpc.report.rejectBudgetSuggestion.useMutation({
    onSuccess: () => {
      toast.success('Budget suggestion rejected')
      utils.report.getById.invalidate({ id: report.id })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reject suggestion')
    },
  })

  const handleApprove = async (
    reportId: string,
    suggestionId: string,
    editedData?: Record<string, unknown>
  ) => {
    await approveSuggestion.mutateAsync({
      reportId,
      suggestionId,
      editedData,
    })
  }

  const handleReject = async (reportId: string, suggestionId: string) => {
    await rejectSuggestion.mutateAsync({
      reportId,
      suggestionId,
    })
  }

  if (report.status === 'GENERATING') {
    return <ReportGeneratingState />
  }

  if (report.status !== 'COMPLETED') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Report is not ready yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const reportData = report.data

  if (!reportData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              Report data is unavailable. Please regenerate the report.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isWeeklyReport = report.period === 'WEEKLY'
  const isInitial = report.isInitial === true

  const monthName = new Date(report.startDate).toLocaleDateString('en-US', {
    month: 'long',
  })

  if (isInitial) {
    return (
      <InitialReport
        reportId={report.id}
        reportData={reportData}
        onApproveSuggestion={handleApprove}
        onRejectSuggestion={handleReject}
      />
    )
  }

  if (isWeeklyReport) {
    return (
      <WeeklyReport
        reportId={report.id}
        reportData={reportData}
        startDate={report.startDate}
        endDate={report.endDate}
        onApproveSuggestion={handleApprove}
        onRejectSuggestion={handleReject}
      />
    )
  }

  return (
    <MonthlyReport
      reportId={report.id}
      monthName={monthName}
      reportData={reportData}
      onApproveSuggestion={handleApprove}
      onRejectSuggestion={handleReject}
    />
  )
}
