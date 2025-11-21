'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingDown, ChevronUp, ChevronDown } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useMemo, useState } from 'react'
import { getCategoryColor } from '@/lib/category-colors'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDateShort } from '@/lib/format'
import { BudgetSuggestionCard } from './budget-suggestion-card'
import { ReportAnalysisSection } from '@/components/reports/report-analysis-section'
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

interface WeeklyExpenseDetail {
  categoryId: string
  categoryName: string
  amount: number
  color?: string | null
  transactions: Transaction[]
}

export function WeeklyReport({
  reportId,
  reportData,
  startDate,
  endDate,
  onApproveSuggestion,
  onRejectSuggestion,
}: WeeklyReportProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  )
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
  const summary = reportData?.llm?.summary ?? []
  const insights = reportData?.llm?.insights ?? []
  const recommendations = reportData?.llm?.suggestionsText ?? []
  const budgetSuggestions = reportData?.llm?.budgetSuggestions ?? []

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

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleAllCategories = (categoryCount: number) => {
    if (expandedCategories.size === categoryCount) {
      setExpandedCategories(new Set())
    } else {
      const categoryIds = weeklyExpenseDetails.map((c) => c.categoryId)
      setExpandedCategories(new Set(categoryIds))
    }
  }

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
                  formatter={(value: number) => formatCurrency(value, currencyCode)}
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

      {weeklyExpenseDetails.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Expense Details</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAllCategories(weeklyExpenseDetails.length)}
              >
                {expandedCategories.size === weeklyExpenseDetails.length
                  ? 'Collapse All'
                  : 'Expand All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {weeklyExpenseDetails.map((category) => {
                const isExpanded = expandedCategories.has(category.categoryId)
                const categoryColor = getCategoryColor(
                  category.categoryName,
                  category.color
                )

                return (
                  <Card
                    key={category.categoryId}
                    className={cn(
                      'transition-colors',
                      isExpanded && 'border-primary/40 bg-muted/30'
                    )}
                  >
                    <CardContent className="p-4">
                      <button
                        onClick={() => toggleCategory(category.categoryId)}
                        className="flex w-full flex-col gap-3 text-left"
                        type="button"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="size-3 rounded-full"
                              style={{ backgroundColor: categoryColor }}
                            />
                            <span className="text-sm font-medium">
                              {category.categoryName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-sm font-bold">
                                {formatCurrency(category.amount, currencyCode)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {pieDenominator
                                  ? (
                                      (category.amount / pieDenominator) *
                                      100
                                    ).toFixed(1)
                                  : '0.0'}
                                %
                              </p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </button>

                      {isExpanded && category.transactions.length > 0 && (
                        <div className="mt-4 space-y-1 border-t pt-3">
                          {category.transactions.map((transaction) => (
                            <div
                              key={transaction.id}
                              className="flex items-center justify-between rounded px-2 py-2 hover:bg-muted"
                            >
                              <div className="flex items-center gap-2">
                                <TrendingDown className="size-3 text-muted-foreground" />
                                <div>
                                  <p className="text-xs font-medium">
                                    {transaction.description}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatDateShort(transaction.occurredAt)}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-semibold">
                                {formatCurrency(transaction.amount, currencyCode)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <ReportAnalysisSection
        summary={summary}
        insights={insights}
        suggestions={recommendations}
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
