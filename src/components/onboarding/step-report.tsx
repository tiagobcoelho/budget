'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Check, Hourglass, TrendingUp } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { InitialReport } from '@/components/reports/initial-report'

interface StepReportProps {}

export const StepReport: React.FC<StepReportProps> = () => {
  const router = useRouter()

  const completeOnboarding = trpc.user.completeOnboarding.useMutation({
    onSuccess: () => {
      toast.success('Onboarding complete!')
      router.push('/dashboard')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to complete onboarding')
    },
  })

  // Fetch reports list and use the first one (user will only have one during onboarding)
  const { data: reports, isLoading: isLoadingReports } =
    trpc.report.list.useQuery({})

  const firstReport = reports?.[0]
  const reportId = firstReport?.id

  const { data: report } = trpc.report.getById.useQuery(
    { id: reportId ?? '' },
    {
      enabled: !!reportId,
      refetchInterval: (query) => {
        const data = query.state.data
        // Poll every 2 seconds if status is PENDING or GENERATING
        // Stop polling if status is COMPLETED or FAILED
        if (data?.status === 'PENDING' || data?.status === 'GENERATING') {
          return 2000
        }
        return false // Stop polling
      },
    }
  )

  const utils = trpc.useUtils()
  const isGenerating =
    report?.status === 'GENERATING' || report?.status === 'PENDING'

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
      utils.report.getById.invalidate({ id: report?.id ?? '' })
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

  // Show loading state while fetching reports
  if (isLoadingReports) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Your financial snapshot
          </h2>
          <p className="text-lg text-muted-foreground">
            Loading your report...
          </p>
        </div>

        <Card className="p-12">
          <div className="flex flex-col items-center gap-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </Card>
      </div>
    )
  }

  // Show empty state if no report found
  if (!reportId || !report) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Your financial snapshot
          </h2>
          <p className="text-lg text-muted-foreground">
            Generate a report to see your financial insights
          </p>
        </div>

        <Card className="p-12">
          <EmptyState
            icon={TrendingUp}
            title="No report generated"
            description="Upload your financial data first to generate a personalized financial report."
          />
        </Card>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Analyzing your finances
          </h2>
          <p className="text-lg text-muted-foreground">
            We&apos;re generating personalized insights just for you
          </p>
        </div>

        <Card className="p-12">
          <div className="flex flex-col items-center gap-6">
            <div className="rounded-full bg-primary/10 p-6">
              <Hourglass className="h-12 w-12 animate-spin text-primary" />
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20 md:pb-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          Your financial snapshot
        </h2>
        <p className="text-lg text-muted-foreground">
          Here&apos;s what we learned from your data
        </p>
      </div>

      {report?.data ? (
        <InitialReport
          reportId={report.id}
          reportData={report.data}
          onApproveSuggestion={handleApprove}
          onRejectSuggestion={handleReject}
        />
      ) : (
        <Card className="p-6">
          <div className="text-center text-sm text-muted-foreground">
            Report data is unavailable. Please try regenerating your report.
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between pt-4">
        {/* Back button handled by parent layout */}
        <Button
          onClick={() => completeOnboarding.mutate()}
          size="lg"
          className="ml-auto gap-2"
          disabled={completeOnboarding.isPending}
        >
          <Check className="h-4 w-4" />
          Complete Setup
        </Button>
      </div>
    </div>
  )
}
