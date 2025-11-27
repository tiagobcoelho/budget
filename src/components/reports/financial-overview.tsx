import { Card, CardContent } from '@/components/ui/card'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc/client'

interface FinancialOverviewProps {
  totals?: {
    income?: number | null
    expenses?: number | null
    savingsRate?: number | null
  }
  title?: string
  className?: string
}

export function FinancialOverview({
  totals,
  title = 'Financial Overview',
  className,
}: FinancialOverviewProps) {
  const { data: preferences } = trpc.preference.get.useQuery()
  const currencyCode =
    (preferences?.defaultCurrencyCode as string | undefined) ?? 'USD'

  if (
    !totals ||
    (totals.income == null &&
      totals.expenses == null &&
      totals.savingsRate == null)
  ) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {totals.income != null && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-5 text-success" />
                <p className="text-sm font-medium text-muted-foreground">
                  Total Income
                </p>
              </div>
              <p className="mt-2 text-3xl font-bold text-success">
                {formatCurrency(totals.income, currencyCode)}
              </p>
            </CardContent>
          </Card>
        )}
        {totals.expenses != null && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingDown className="size-5 text-destructive" />
                <p className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </p>
              </div>
              <p className="mt-2 text-3xl font-bold">
                {formatCurrency(totals.expenses, currencyCode)}
              </p>
            </CardContent>
          </Card>
        )}
        {totals.savingsRate != null && (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">
                Savings Rate
              </p>
              <p className="mt-2 text-3xl font-bold text-primary">
                {(totals.savingsRate * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
