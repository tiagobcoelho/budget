'use client'

import { BudgetCard } from '@/components/budget-card'
import { FinancialOverview } from '@/components/reports/financial-overview'
import { BudgetSuggestionCard } from '@/components/reports/budget-suggestion-card'
import { BehaviorPatternsSection } from '@/components/reports/monthly/behavior-patterns-section'
import { RisksOpportunitiesSection } from '@/components/reports/monthly/risks-opportunities-section'
import {
  BudgetSuggestion,
  ReportData,
} from '@/server/trpc/schemas/report.schema'

interface InitialReportProps {
  reportId: string
  reportData?: ReportData | null
  onApproveSuggestion: (
    reportId: string,
    suggestionId: string,
    editedData?: Record<string, unknown>
  ) => Promise<void>
  onRejectSuggestion: (reportId: string, suggestionId: string) => Promise<void>
}

export function InitialReport({
  reportId,
  reportData,
  onApproveSuggestion,
  onRejectSuggestion,
}: InitialReportProps) {
  const totals = reportData?.totals
  const categories = reportData?.categories ?? []
  const budgetSuggestions =
    reportData?.llm?.budgetSuggestions?.filter(
      (suggestion): suggestion is BudgetSuggestion => !!suggestion.id
    ) ?? []
  const behaviorPatterns = reportData?.llm?.behaviorPatterns ?? []
  const risks = reportData?.llm?.risks ?? []
  const opportunities = reportData?.llm?.opportunities ?? []

  const totalSpent = totals?.expenses ?? 0

  return (
    <div className="space-y-6">
      <FinancialOverview totals={totals} />

      <div className="space-y-4">
        <BudgetCard
          totalAllocated={0}
          totalSpent={totalSpent}
          percentage={0}
          remaining={0}
          categories={categories}
          title="Your Expenses"
        />
      </div>

      <BehaviorPatternsSection behaviorPatterns={behaviorPatterns} />

      <RisksOpportunitiesSection
        risks={risks ?? []}
        opportunities={opportunities ?? []}
      />

      {!!budgetSuggestions.length && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">
              Budget Recommendations
            </h3>
            <p className="text-sm text-muted-foreground">
              Review, edit, or remove the starter budgets we created from your
              data
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {budgetSuggestions.map((suggestion) => (
              <BudgetSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                reportId={reportId}
                onApprove={onApproveSuggestion}
                onReject={onRejectSuggestion}
                variant="initial"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
