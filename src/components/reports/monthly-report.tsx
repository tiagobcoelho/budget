'use client'

import { BudgetCard } from '@/components/budget-card'
import { BudgetSuggestionCard } from './budget-suggestion-card'
import {
  BudgetSuggestion,
  ReportData,
} from '@/server/trpc/schemas/report.schema'
import { trpc } from '@/lib/trpc/client'
import { MonthAtGlanceSection } from './monthly/month-at-glance-section'
import { CategoryDeepDiveSection } from './monthly/category-deep-dive-section'
import { BudgetAdherenceSection } from './monthly/budget-adherence-section'
import { BehaviorPatternsSection } from './monthly/behavior-patterns-section'
import { RisksOpportunitiesSection } from './monthly/risks-opportunities-section'

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
  const categories = reportData?.categories ?? []
  const budgetSuggestions = reportData?.llm?.budgetSuggestions ?? []
  const behaviorPatterns = reportData?.llm?.behaviorPatterns ?? []
  const risks = reportData?.llm?.risks ?? []
  const opportunities = reportData?.llm?.opportunities ?? []
  const analytics = reportData?.analytics?.monthly
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

  if (!analytics) {
    return null
  }

  return (
    <div className="space-y-10 pb-20 md:pb-6">
      <MonthAtGlanceSection analytics={analytics} currencyCode={currencyCode} />

      {!!budgetAllocations.length && (
        <BudgetCard
          monthName={monthName}
          totalAllocated={totalAllocated}
          totalSpent={totalSpent}
          percentage={percentage}
          remaining={remaining}
          allocations={budgetAllocations}
          categoriesWithoutBudgets={categoriesWithoutBudgets}
        />
      )}

      <CategoryDeepDiveSection
        analytics={analytics}
        currencyCode={currencyCode}
      />

      <BudgetAdherenceSection
        analytics={analytics}
        currencyCode={currencyCode}
      />

      <BehaviorPatternsSection behaviorPatterns={behaviorPatterns} />

      <RisksOpportunitiesSection risks={risks} opportunities={opportunities} />

      {!!budgetSuggestions.length && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">
            Refined Budget Suggestions
          </h2>
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
