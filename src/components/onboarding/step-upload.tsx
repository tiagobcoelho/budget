'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc/client'
import { TransactionList } from '@/components/transactions/transactions-list'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { isTransactionIncomplete } from '../transactions/transactions-card'
import { TransactionsTabs } from '@/components/transactions/transactions-tabs'

interface StepUploadProps {
  onComplete?: () => void
}

export const StepUpload: React.FC<StepUploadProps> = ({ onComplete }) => {
  // Fetch transactions by IDs
  const transactionsQuery = trpc.transaction.list.useQuery({
    limit: 100,
  })

  // Filter to only show transactions that were just created
  const transactions = useMemo(
    () => transactionsQuery.data?.items || [],
    [transactionsQuery.data?.items]
  )

  const canGenerateReport = useMemo(() => {
    if (transactions.length === 0) return false
    if (transactions.some((t) => !t.reviewed)) return false
    if (transactions.some((t) => isTransactionIncomplete(t))) return false
    return true
  }, [transactions])

  const dateRange = useMemo(() => {
    if (transactions.length === 0) return null
    const dates = transactions.map((t) => new Date(t.occurredAt))
    return {
      oldest: new Date(Math.min(...dates.map((d) => d.getTime())))
        .toISOString()
        .split('T')[0],
      latest: new Date(Math.max(...dates.map((d) => d.getTime())))
        .toISOString()
        .split('T')[0],
    }
  }, [transactions])

  const generateReport = trpc.report.generate.useMutation({
    onSuccess: async (report) => {
      // Trigger async report generation (fire-and-forget)
      // This runs server-side and will continue even if client disconnects
      try {
        const response = await fetch('/api/reports/generate/initial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId: report.id }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.error || 'Failed to start report generation'
          )
        }

        toast.success('Report generation started')
        updateOnboardingStep.mutate({ step: 5 })
      } catch (error) {
        console.error('Error triggering report generation:', error)
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to start report generation'
        )
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate report')
    },
  })

  const updateOnboardingStep = trpc.user.updateOnboardingStep.useMutation({
    onSuccess: () => {
      // Advance to next step
      if (onComplete) {
        onComplete()
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update step')
    },
  })

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          Add your transactions
        </h2>
        <p className="text-lg text-muted-foreground">
          Import from bank statements or add manually
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload or add transactions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Import bank statements or create entries manually.
          </p>
        </CardHeader>
        <CardContent>
          <TransactionsTabs />
        </CardContent>
      </Card>

      {/* Created Transactions List */}
      {(transactionsQuery.data?.total ?? 0) > 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Created Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {transactionsQuery.data?.total ?? 0} transaction
                {(transactionsQuery.data?.total ?? 0) !== 1 ? 's' : ''} created.
                Review and edit them below if needed.
              </p>
              <TransactionList />
            </CardContent>
          </Card>
          <div className="flex items-center justify-end pt-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    if (dateRange) {
                      generateReport.mutate({
                        period: 'MONTHLY',
                        startDate: dateRange.oldest,
                        endDate: dateRange.latest,
                        isInitial: true,
                      })
                    }
                  }}
                  disabled={generateReport.isPending || !canGenerateReport}
                >
                  Generate Report
                </Button>
              </TooltipTrigger>
              {!canGenerateReport && (
                <TooltipContent>
                  Please review and complete all transactions before generating
                  a report
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  )
}
