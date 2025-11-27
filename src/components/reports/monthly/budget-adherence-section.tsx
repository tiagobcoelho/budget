import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/format'
import type { MonthlyReportAnalytics } from '@/services/report-generation.service/types'

interface BudgetAdherenceSectionProps {
  analytics: MonthlyReportAnalytics
  currencyCode: string
}

export function BudgetAdherenceSection({
  analytics,
  currencyCode,
}: BudgetAdherenceSectionProps) {
  const adherence = analytics.budgetAdherence
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Budget adherence
          </p>
          <h2 className="text-xl font-semibold">How well the plan held up</h2>
        </div>
        {adherence.score !== null && (
          <Badge variant="outline">
            {adherence.score.toFixed(1)} • Grade {adherence.grade}
          </Badge>
        )}
      </div>
      {adherence.breakdown.length ? (
        <div className="space-y-3">
          {adherence.breakdown.slice(0, 5).map((item) => (
            <div key={item.budgetId} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between text-sm">
                <p className="font-medium">{item.categoryName}</p>
                <Badge
                  variant={
                    item.status === 'OVER'
                      ? 'destructive'
                      : item.status === 'UNDER'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {item.status === 'OVER'
                    ? 'Over budget'
                    : item.status === 'UNDER'
                      ? 'Under'
                      : 'On track'}
                </Badge>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {formatCurrency(item.spent, currencyCode)} of{' '}
                  {formatCurrency(item.budgeted, currencyCode)}
                </span>
                <span>{Math.min(item.ratio * 100, 500).toFixed(0)}%</span>
              </div>
              <Progress
                value={Math.min(item.ratio * 100, 120)}
                className="mt-2"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No monthly budgets recorded yet.
        </p>
      )}
    </section>
  )
}
