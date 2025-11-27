'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingDown } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useMemo } from 'react'
import { getCategoryColor } from '@/lib/category-colors'
import { formatCurrency } from '@/lib/format'
import { BudgetSuggestionCard } from './budget-suggestion-card'
import { WeeklyGuidanceSection } from '@/components/reports/weekly-guidance-section'
import { WeeklyBudgetProjectionSection } from '@/components/reports/weekly/budget-projection-section'
import type { WeeklyExpenseDetail } from '@/components/reports/weekly/types'
import {
  BudgetSuggestion,
  ReportData,
} from '@/server/trpc/schemas/report.schema'
import { Transaction } from '@/server/trpc/schemas/transaction.schema'
import { trpc } from '@/lib/trpc/client'

interface WeeklyReportProps {
  reportId: string
  reportData?: ReportData | null
  startDate: string | Date
  endDate: string | Date
  onApproveSuggestion: (
    reportId: string,
    suggestionId: string,
    editedData?: Record<string, unknown>
  ) => Promise<void>
  onRejectSuggestion: (reportId: string, suggestionId: string) => Promise<void>
}

interface PieDataItem {
  name: string
  value: number
  percentage: number
  color: string
}

export function WeeklyReport({
  reportId,
  reportData,
  startDate,
  endDate,
  onApproveSuggestion,
  onRejectSuggestion,
}: WeeklyReportProps) {
  const { data: preferences } = trpc.preference.get.useQuery()
  const currencyCode =
    (preferences?.defaultCurrencyCode as string | undefined) ?? 'USD'

  const { weekStart, weekEnd } = useMemo(() => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    return { weekStart: start, weekEnd: end }
  }, [startDate, endDate])

  const totals = reportData?.totals
  const budgetSuggestions = reportData?.llm?.budgetSuggestions ?? []
  const potentialIssues = reportData?.llm?.potentialIssues ?? []
  const recommendedActions = reportData?.llm?.recommendedActions ?? []
  const weeklyProjection = reportData?.analytics?.weeklyProjection ?? null

  const weeklyExpenseDetails = useMemo<WeeklyExpenseDetail[]>(() => {
    const categories = reportData?.categories ?? []
    return categories
      .map((category): WeeklyExpenseDetail | null => {
        const amount = category.spent ?? 0
        if (amount <= 0) return null

        const filteredTransactions = (category.transactions ?? []).filter(
          (transaction) => {
            const transactionDate = new Date(transaction.occurredAt)
            return transactionDate >= weekStart && transactionDate <= weekEnd
          }
        ) as Transaction[]

        return {
          categoryId: category.id,
          categoryName: category.name,
          amount,
          color: category.color ?? null,
          transactions: filteredTransactions,
        }
      })
      .filter((category): category is WeeklyExpenseDetail => category !== null)
  }, [reportData?.categories, weekEnd, weekStart])

  const derivedTotal = weeklyExpenseDetails.reduce(
    (sum, category) => sum + category.amount,
    0
  )

  const totalExpenses = totals?.expenses ?? derivedTotal
  const dailyAverage = totalExpenses / 7

  const pieDenominator = derivedTotal || totalExpenses || 0

  const pieData: PieDataItem[] =
    weeklyExpenseDetails.map((cat) => ({
      name: cat.categoryName,
      value: cat.amount,
      percentage: pieDenominator ? (cat.amount / pieDenominator) * 100 : 0,
      color: getCategoryColor(cat.categoryName, cat.color),
    })) || []

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingDown className="size-5 text-destructive" />
              <p className="text-sm font-medium text-muted-foreground">
                Total Expenses
              </p>
            </div>
            <p className="mt-2 text-4xl font-bold">
              {formatCurrency(totalExpenses, currencyCode)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Daily average: {formatCurrency(dailyAverage, currencyCode)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: PieDataItem) =>
                    `${entry.name}: ${entry.percentage.toFixed(1)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    formatCurrency(value, currencyCode)
                  }
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {weeklyProjection && (
        <WeeklyBudgetProjectionSection
          data={weeklyProjection}
          currencyCode={currencyCode}
          expenseDetails={weeklyExpenseDetails}
        />
      )}

      <WeeklyGuidanceSection
        potentialIssues={potentialIssues}
        recommendedActions={recommendedActions}
      />

      {budgetSuggestions.length > 0 && (
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
