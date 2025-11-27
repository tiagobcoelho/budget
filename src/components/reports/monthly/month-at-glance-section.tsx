import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import type { MonthlyReportAnalytics } from '@/services/report-generation.service/types'

interface MonthAtGlanceSectionProps {
  analytics: MonthlyReportAnalytics
  currencyCode: string
}

export function MonthAtGlanceSection({
  analytics,
  currencyCode,
}: MonthAtGlanceSectionProps) {
  const glance = analytics.monthAtGlance
  const adherence = analytics.budgetAdherence

  // Calculate biggest change
  let biggestChange: { label: string; value: string; icon: ReactNode } | null =
    null
  if (
    glance.previousIncome !== undefined &&
    glance.previousExpenses !== undefined
  ) {
    const incomeChange =
      glance.previousIncome > 0
        ? ((glance.totalIncome - glance.previousIncome) /
            glance.previousIncome) *
          100
        : 0
    const expenseChange =
      glance.previousExpenses > 0
        ? ((glance.totalExpenses - glance.previousExpenses) /
            glance.previousExpenses) *
          100
        : 0

    if (Math.abs(incomeChange) > Math.abs(expenseChange)) {
      biggestChange = {
        label: 'Income Change',
        value: `${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(1)}%`,
        icon:
          incomeChange >= 0 ? (
            <ArrowUpRight className="size-4 text-success" />
          ) : (
            <ArrowDownRight className="size-4 text-destructive" />
          ),
      }
    } else {
      biggestChange = {
        label: 'Spending Change',
        value: `${expenseChange >= 0 ? '+' : ''}${expenseChange.toFixed(1)}%`,
        icon:
          expenseChange >= 0 ? (
            <ArrowUpRight className="size-4 text-destructive" />
          ) : (
            <ArrowDownRight className="size-4 text-success" />
          ),
      }
    }
  }

  const cards = [
    {
      label: 'Total Income',
      value: formatCurrency(glance.totalIncome, currencyCode),
      icon: <TrendingUp className="size-4 text-success" />,
    },
    {
      label: 'Total Spending',
      value: formatCurrency(glance.totalExpenses, currencyCode),
      icon: <TrendingDown className="size-4 text-destructive" />,
    },
    {
      label: 'Savings',
      value: formatCurrency(glance.savingsAmount, currencyCode),
      icon: <Sparkles className="size-4 text-primary" />,
    },
    {
      label: 'Savings Rate',
      value: `${glance.savingsRate.toFixed(1)}%`,
      icon: <Sparkles className="size-4 text-primary" />,
    },
    ...(biggestChange
      ? [
          {
            label: biggestChange.label,
            value: biggestChange.value,
            icon: biggestChange.icon,
          },
        ]
      : []),
    {
      label: 'Budget Score',
      value:
        adherence.score !== null
          ? `${adherence.score.toFixed(1)} (${adherence.grade})`
          : 'No budgets',
      icon: <Sparkles className="size-4 text-primary" />,
    },
  ]

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Month at a Glance
          </p>
          <h2 className="text-2xl font-semibold">
            Ground the month in reality
          </h2>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {card.icon}
                <span>{card.label}</span>
              </div>
              <p className="text-lg font-semibold leading-tight">
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
