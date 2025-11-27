import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MonthlyReportAnalytics } from '@/services/report-generation.service/types'
import { HighlightCard } from './highlight-card'

interface CategoryDeepDiveSectionProps {
  analytics: MonthlyReportAnalytics
  currencyCode: string
}

export function CategoryDeepDiveSection({
  analytics,
  currencyCode,
}: CategoryDeepDiveSectionProps) {
  const { categoryTotals, categoryHistory } = analytics

  // Get top 5 categories
  const topCategories = categoryTotals.slice(0, 5)

  // Find categories with spikes (high change percentage)
  const spikes = categoryTotals
    .filter(
      (cat) =>
        cat.changePct !== null &&
        cat.changePct !== undefined &&
        cat.changePct > 30
    )
    .slice(0, 3)

  // Find stable categories (low volatility from history)
  const stableCategories = categoryHistory
    .filter((hist) => hist.volatility !== null && hist.volatility < 0.2)
    .slice(0, 3)
    .map((hist) => {
      const current = categoryTotals.find(
        (c) => c.categoryId === hist.categoryId
      )
      return current ? { name: current.name, amount: current.amount } : null
    })
    .filter((item): item is { name: string; amount: number } => item !== null)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Spending Breakdown
          </p>
          <h2 className="text-xl font-semibold">Category deep dive</h2>
        </div>
        <Badge variant="outline">Top {topCategories.length} contributors</Badge>
      </div>
      <div className="divide-y rounded-lg border bg-card">
        {topCategories.map((category, index) => {
          const history = categoryHistory.find(
            (h) => h.categoryId === category.categoryId
          )
          const isVolatile =
            history?.volatility !== null &&
            history?.volatility !== undefined &&
            history.volatility > 0.3
          const isSpike =
            category.changePct !== null &&
            category.changePct !== undefined &&
            category.changePct > 30

          return (
            <div
              key={`${category.categoryId}-${index}`}
              className="flex items-center gap-4 p-4"
            >
              <div className="text-xs text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="flex-1">
                <p className="font-medium">{category.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(category.amount, currencyCode)}{' '}
                  {category.changePct !== null &&
                    category.changePct !== undefined && (
                      <span
                        className={cn(
                          'font-semibold',
                          category.changePct > 0
                            ? 'text-destructive'
                            : 'text-success'
                        )}
                      >
                        {category.changePct > 0 ? '+' : ''}
                        {category.changePct.toFixed(1)}%
                      </span>
                    )}
                </p>
              </div>
              {(isSpike || isVolatile) && (
                <Badge variant={isSpike ? 'destructive' : 'secondary'}>
                  {isSpike ? 'Spike' : 'Volatile'}
                </Badge>
              )}
              {!isSpike &&
                !isVolatile &&
                history &&
                history.volatility !== null &&
                history.volatility !== undefined &&
                history.volatility < 0.2 && (
                  <Badge variant="outline">Stable</Badge>
                )}
            </div>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <HighlightCard
          title="Unexpected spikes"
          items={spikes.map((item) => ({
            title: item.name,
            body: `${formatCurrency(item.amount, currencyCode)}${item.previousAmount ? ` vs ${formatCurrency(item.previousAmount, currencyCode)}` : ''}`,
          }))}
        />
        <HighlightCard
          title="Stable categories"
          items={stableCategories.map((item) => ({
            title: item.name,
            body: `${formatCurrency(item.amount, currencyCode)} this month`,
          }))}
        />
      </div>
    </section>
  )
}
