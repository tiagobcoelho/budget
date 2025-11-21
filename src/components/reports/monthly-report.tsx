'use client'

import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { BudgetCard } from '@/components/budget-card'
import { BudgetSuggestionCard } from './budget-suggestion-card'
import { ReportAnalysisSection } from '@/components/reports/report-analysis-section'
import {
  BudgetSuggestion,
  ReportData,
} from '@/server/trpc/schemas/report.schema'
import { trpc } from '@/lib/trpc/client'

interface MonthlyReportProps {
  reportId: string
  monthName: string
  reportData?: ReportData | null
  onApproveSuggestion: (
    reportId: string,
    suggestionId: string,
    editedData?: Record<string, unknown>
  ) => Promise<void>
  onRejectSuggestion: (reportId: string, suggestionId: string) => Promise<void>
}

export function MonthlyReport({
  reportId,
  monthName,
  reportData,
  onApproveSuggestion,
  onRejectSuggestion,
}: MonthlyReportProps) {
  const totals = reportData?.totals
  const categories = reportData?.categories ?? []
  const summary = reportData?.llm?.summary ?? []
  const insights = reportData?.llm?.insights ?? []
  const suggestionsText = reportData?.llm?.suggestionsText ?? []
  const budgetSuggestions = reportData?.llm?.budgetSuggestions ?? []
  const { data: preferences } = trpc.preference.get.useQuery()
  const currencyCode =
    (preferences?.defaultCurrencyCode as string | undefined) ?? 'USD'

  const budgetAllocations = categories
    .filter((category) => category.hasBudget)
    .map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      allocated: category.budgetAmount ?? 0,
      spent: category.spent ?? 0,
      color: category.color,
      transactions: category.transactions ?? [],
    }))

  const categoriesWithoutBudgets = categories
    .filter((category) => !category.hasBudget)
    .map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      color: category.color,
      transactions: category.transactions ?? [],
    }))

  const totalAllocated = budgetAllocations.reduce(
    (sum, allocation) => sum + allocation.allocated,
    0
  )
  const totalSpent = budgetAllocations.reduce(
    (sum, allocation) => sum + allocation.spent,
    0
  )
  const remaining = totalAllocated - totalSpent
  const percentage =
    totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0

  const savingsRatePercent =
    totals?.savingsRate != null ? totals.savingsRate * 100 : undefined

  const income = totals?.income
  const expenses = totals?.expenses
  const savingsRate =
    savingsRatePercent !== undefined ? savingsRatePercent : undefined

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {!!totals && (
        <div className="grid gap-4 sm:grid-cols-3">
          {income !== undefined && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-success" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Total Income
                  </p>
                </div>
                <p className="mt-2 text-3xl font-bold text-success">
                  {formatCurrency(income, currencyCode)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          )}
          {expenses !== undefined && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="size-4 text-destructive" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Total Expenses
                  </p>
                </div>
                <p className="mt-2 text-3xl font-bold">
                  {formatCurrency(expenses, currencyCode)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          )}
          {savingsRate !== undefined && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Savings Rate
                </p>
                <p className="mt-2 text-3xl font-bold text-primary">
                  {savingsRate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!!budgetAllocations.length && (
        <BudgetCard
          monthName={monthName}
          totalAllocated={totalAllocated}
          totalSpent={totalSpent}
          percentage={percentage}
          remaining={remaining}
          allocations={budgetAllocations}
          categoriesWithoutBudgets={categoriesWithoutBudgets}
          showTransactionAlert={false}
        />
      )}

      <ReportAnalysisSection
        summary={summary}
        insights={insights}
        suggestions={suggestionsText}
      />

      {!!budgetSuggestions.length && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Budget Recommendations</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {budgetSuggestions.map((suggestion: BudgetSuggestion) => (
              <BudgetSuggestionCard
                key={suggestion.id ?? suggestion.suggestion?.name}
                suggestion={suggestion}
                reportId={reportId}
                onApprove={onApproveSuggestion}
                onReject={onRejectSuggestion}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
