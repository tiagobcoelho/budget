'use client'

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TransactionForm,
  type TransactionFormValues,
} from '@/components/transactions/transaction-form'
import { trpc } from '@/lib/trpc/client'
import { TransactionList } from '@/components/transactions/transactions-list'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PdfUploader } from '@/components/transactions/transactions-uploader'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Transaction } from '@prisma/client'
import { isTransactionIncomplete } from '../transactions/transactions-card'

interface StepUploadProps {
  onComplete?: () => void
}

export const StepUpload: React.FC<StepUploadProps> = ({ onComplete }) => {
  const utils = trpc.useUtils()
  const { data: categories = [] } = trpc.category.list.useQuery()
  const { data: accounts = [] } = trpc.account.list.useQuery()
  // Fetch transactions by IDs
  const transactionsQuery = trpc.transaction.list.useQuery({
    limit: 100,
  })

  // Filter to only show transactions that were just created
  const transactions = useMemo(
    () => transactionsQuery.data?.items || [],
    [transactionsQuery.data?.items]
  )

  const [showManualForm, setShowManualForm] = useState(false)

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
        const response = await fetch('/api/reports/generate', {
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

  const createTransaction = trpc.transaction.create.useMutation({
    onSuccess: () => {
      toast.success('Transaction added successfully')
      utils.transaction.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add transaction')
    },
  })

  const onCreateManualTransaction = (data: TransactionFormValues) => {
    createTransaction.mutate({
      ...data,
      occurredAt: new Date(data.occurredAt).toISOString(),
    })
  }

  const handleTransactionsExtracted = useCallback(
    (transactions: Transaction[]) => {
      if (transactions.length === 0) {
        return
      }

      if (transactions.length > 0) {
        toast.success(
          `Created ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} from PDF. You can edit them below.`
        )
        utils.transaction.list.invalidate()
      }
    },
    [utils.transaction.list]
  )

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

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload Files</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <PdfUploader onTransactionsExtracted={handleTransactionsExtracted} />
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          {!showManualForm ? (
            <Card className="border-2 border-dashed border-border p-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-foreground">
                    No transactions yet
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Add your first transaction manually
                  </p>
                </div>
                <Button onClick={() => setShowManualForm(true)}>
                  Add Transaction
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Add Transaction Manually</CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionForm
                  formId="manual-transaction-form"
                  categories={categories}
                  accounts={accounts}
                  showSubmitButton={true}
                  submitLabel={
                    createTransaction.isPending
                      ? 'Adding...'
                      : 'Add Transaction'
                  }
                  isSubmitting={createTransaction.isPending}
                  onSubmit={onCreateManualTransaction}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
              <TransactionList
                transactionIds={transactions.map((t) => t.id)}
                allowDelete
              />
            </CardContent>
          </Card>
          <div className="flex items-center justify-end pt-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    if (dateRange) {
                      generateReport.mutate({
                        period: 'CUSTOM',
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
