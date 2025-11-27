'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, Edit, TrendingUp, Trash2 } from 'lucide-react'
import {
  BudgetSuggestionDialog,
  type BudgetSuggestionFormValues,
} from './budget-suggestion-dialog'
import { useState, useMemo } from 'react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { BudgetSuggestion } from '@/server/trpc/schemas/report.schema'

interface BudgetSuggestionCardProps {
  suggestion: BudgetSuggestion
  reportId: string
  onApprove: (
    reportId: string,
    suggestionId: string,
    editedData?: {
      name?: string
      amount?: number
    }
  ) => Promise<void>
  onReject: (reportId: string, suggestionId: string) => Promise<void>
  variant?: 'suggestion' | 'initial'
}

export function BudgetSuggestionCard({
  suggestion,
  reportId,
  onApprove,
  onReject,
  variant = 'suggestion',
}: BudgetSuggestionCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { data: categories } = trpc.category.list.useQuery()
  const { data: preferences } = trpc.preference.get.useQuery()
  const utils = trpc.useUtils()
  const isInitialVariant = variant === 'initial'
  const currencyCode =
    (preferences?.defaultCurrencyCode as string | undefined) ?? 'USD'

  // Create a map for quick category lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    categories?.forEach((cat) => {
      map.set(cat.id, cat.name)
    })
    return map
  }, [categories])

  // Helper to get category name
  const getCategoryName = (categoryId: string | undefined) => {
    if (!categoryId) return 'Unknown Category'
    return categoryMap.get(categoryId) || categoryId
  }

  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount)
  }

  const updateBudget = trpc.budget.update.useMutation({
    onSuccess: async () => {
      toast.success('Budget updated')
      await Promise.all([
        utils.budget.list.invalidate(),
        utils.report.getById.invalidate({ id: reportId }),
      ])
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update budget')
    },
  })

  const deleteBudget = trpc.budget.delete.useMutation({
    onSuccess: async () => {
      toast.success('Budget deleted')
      await Promise.all([
        utils.budget.list.invalidate(),
        utils.report.getById.invalidate({ id: reportId }),
      ])
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete budget')
    },
  })

  const actionPending =
    isProcessing || updateBudget.isPending || deleteBudget.isPending

  const budgetId = suggestion.budgetId

  const handleApprove = async (editedData?: BudgetSuggestionFormValues) => {
    setIsProcessing(true)
    try {
      await onApprove(
        reportId,
        suggestion.id ?? '',
        editedData
          ? {
              name: editedData.name,
              amount: editedData.amount,
            }
          : undefined
      )
    } finally {
      setIsProcessing(false)
      setIsEditDialogOpen(false)
    }
  }

  const handleReject = async () => {
    setIsProcessing(true)
    try {
      await onReject(reportId, suggestion.id ?? '')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBudgetUpdate = async (editedData: BudgetSuggestionFormValues) => {
    if (!budgetId) return
    await updateBudget.mutateAsync({
      id: budgetId,
      categoryId: editedData.categoryId,
      name: editedData.name,
      startDate: new Date(editedData.startDate).toISOString(),
      endDate: new Date(editedData.endDate).toISOString(),
      amount: editedData.amount,
    })
    setIsEditDialogOpen(false)
  }

  const handleDeleteBudget = async () => {
    if (!budgetId) return
    await deleteBudget.mutateAsync({ id: budgetId })
  }

  if (!isInitialVariant && suggestion.status !== 'PENDING') {
    return (
      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {suggestion.type === 'CREATE' ? 'Create Budget' : 'Update Budget'}
            </CardTitle>
            <Badge
              className={
                suggestion.status === 'APPROVED'
                  ? 'bg-green-500'
                  : suggestion.status === 'REJECTED'
                    ? 'bg-red-500'
                    : 'bg-gray-500'
              }
            >
              {suggestion.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {suggestion.status === 'APPROVED'
              ? 'This suggestion has been approved.'
              : 'This suggestion has been rejected.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {suggestion.type === 'CREATE' ? 'Create Budget' : 'Update Budget'}
            </CardTitle>
            <Badge variant={isInitialVariant ? 'secondary' : 'outline'}>
              {isInitialVariant ? 'Active' : 'Pending'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestion.type === 'CREATE' && suggestion.suggestion && (
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">
                  {suggestion.suggestion.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Monthly • {formatCurrencyLocal(suggestion.suggestion.amount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  This will create a recurring monthly budget that auto-rolls
                  each month
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Category:
                </p>
                <p className="text-sm font-medium">
                  {getCategoryName(suggestion.suggestion.categoryId)}
                </p>
              </div>
            </div>
          )}

          {suggestion.type === 'UPDATE' &&
            suggestion.currentBudget &&
            suggestion.suggestedChanges && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">
                    {suggestion.currentBudget.name}
                  </p>
                </div>
                {suggestion.suggestedChanges.amount !== undefined && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <span className="text-sm">Total Amount</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formatCurrencyLocal(suggestion.currentBudget.amount)}
                        </span>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">
                          {formatCurrencyLocal(
                            suggestion.suggestedChanges.amount
                          )}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      This will update the recurring budget definition,
                      affecting future periods
                    </p>
                  </div>
                )}
                {suggestion.suggestedChanges.categoryId && (
                  <div className="rounded-md border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Category Change:
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {getCategoryName(suggestion.currentBudget?.categoryId)}
                      </span>
                      <TrendingUp className="h-3 w-3 text-blue-500" />
                      <span className="text-sm font-medium">
                        {getCategoryName(
                          suggestion.suggestedChanges.categoryId
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

          <div className="rounded-md bg-muted p-3">
            <p className="text-xs font-medium mb-1">Reasoning:</p>
            <p className="text-sm text-muted-foreground">
              {suggestion.reasoning}
            </p>
            {suggestion.expectedImpact && (
              <>
                <p className="text-xs font-medium mt-2 mb-1">
                  Expected Impact:
                </p>
                <p className="text-sm text-muted-foreground">
                  {suggestion.expectedImpact}
                </p>
              </>
            )}
          </div>

          {isInitialVariant ? (
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                disabled={actionPending || !budgetId}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Budget
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteBudget}
                disabled={actionPending || !budgetId}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                disabled={actionPending}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleApprove()}
                disabled={actionPending}
              >
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReject}
                disabled={actionPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <BudgetSuggestionDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        suggestion={suggestion}
        mode={isInitialVariant ? 'initial' : 'suggestion'}
        onSubmit={isInitialVariant ? handleBudgetUpdate : handleApprove}
      />
    </>
  )
}
