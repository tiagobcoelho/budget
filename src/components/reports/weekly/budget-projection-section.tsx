'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getCategoryColor } from '@/lib/category-colors'
import type { WeeklyBudgetProjectionAnalytics } from '@/services/report-generation.service/types'
import type { WeeklyExpenseDetail } from '@/components/reports/weekly/types'

interface WeeklyBudgetProjectionSectionProps {
  data: WeeklyBudgetProjectionAnalytics
  currencyCode: string
  expenseDetails?: WeeklyExpenseDetail[]
}

const STATUS_META: Record<
  string,
  { label: string; className: string; borderClass: string }
> = {
  ON_TRACK: {
    label: 'On pace',
    className: 'text-emerald-400 bg-emerald-400/10',
    borderClass: 'border-emerald-500/40',
  },
  AT_RISK: {
    label: 'At risk',
    className: 'text-amber-400 bg-amber-400/10',
    borderClass: 'border-amber-500/40',
  },
  OVER: {
    label: 'Over budget',
    className: 'text-red-400 bg-red-400/10',
    borderClass: 'border-red-500/40',
  },
  LUMPY: {
    label: 'Lump sum',
    className: 'text-slate-300 bg-slate-300/10',
    borderClass: 'border-slate-500/40',
  },
  INSUFFICIENT_DATA: {
    label: 'Low confidence',
    className: 'text-slate-300 bg-slate-300/10',
    borderClass: 'border-slate-500/40',
  },
}

type ProjectionTone = 'good' | 'alright' | 'alarming' | 'bad' | 'neutral'

const SUMMARY_TONE_META: Record<
  ProjectionTone,
  {
    label: string
    cardClass: string
    panelClass: string
    accentText: string
    helperText?: string
  }
> = {
  good: {
    label: 'Good progress',
    cardClass: 'border-emerald-500/40 bg-emerald-500/5',
    panelClass: 'border-emerald-500/30 bg-emerald-500/10',
    accentText: 'text-emerald-600 dark:text-emerald-300',
    helperText: 'Comfortably under this month’s budget.',
  },
  alright: {
    label: 'Alright pace',
    cardClass: 'border-sky-500/40 bg-sky-500/5',
    panelClass: 'border-sky-500/30 bg-sky-500/10',
    accentText: 'text-sky-600 dark:text-sky-300',
    helperText: 'Tracking close to the planned budget.',
  },
  alarming: {
    label: 'Alarming trend',
    cardClass: 'border-amber-500/40 bg-amber-500/5',
    panelClass: 'border-amber-500/30 bg-amber-500/10',
    accentText: 'text-amber-600 dark:text-amber-300',
    helperText: 'Slightly ahead of plan—worth a closer look.',
  },
  bad: {
    label: 'Bad trajectory',
    cardClass: 'border-destructive/40 bg-destructive/5',
    panelClass: 'border-destructive/30 bg-destructive/10',
    accentText: 'text-destructive',
    helperText: 'Projected to finish above the monthly budget.',
  },
  neutral: {
    label: 'Monitoring actuals',
    cardClass: 'border-muted/40 bg-muted/10',
    panelClass: 'border-muted/40 bg-background/80',
    accentText: 'text-muted-foreground',
    helperText: 'Not enough signal yet—showing actual spend so far.',
  },
}

const determineProjectionTone = ({
  projected,
  actual,
  budget,
}: {
  projected: number | null
  actual: number
  budget: number
}): ProjectionTone => {
  if (budget <= 0) return 'neutral'
  if (projected === null) return 'neutral'

  const ratio = projected / budget
  if (actual >= budget || ratio >= 1.1) return 'bad'
  if (ratio >= 1.02) return 'alarming'
  if (ratio >= 0.9) return 'alright'
  return 'good'
}

export function WeeklyBudgetProjectionSection({
  data,
  currencyCode,
  expenseDetails = [],
}: WeeklyBudgetProjectionSectionProps) {
  console.log('data', data)
  console.log('expenseDetails', expenseDetails)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    {}
  )
  const categories = [...data.categories].sort(
    (a, b) => b.spentThisMonth - a.spentThisMonth
  )
  const projectedTotal =
    data.summary.projectedMonthEndTotal ?? data.summary.actualMonthToDate
  const projectedDelta =
    data.summary.projectedVariance ??
    data.summary.actualMonthToDate - data.summary.totalBudget
  const summaryTone = determineProjectionTone({
    projected: data.summary.projectedMonthEndTotal,
    actual: data.summary.actualMonthToDate,
    budget: data.summary.totalBudget,
  })
  const toneMeta = SUMMARY_TONE_META[summaryTone]
  const hasProjection = data.summary.projectedMonthEndTotal !== null

  // Create a map of budget categories for quick lookup
  const budgetCategoriesMap = new Map(
    categories.map((cat) => [cat.categoryId, cat])
  )

  // Start with all expense details (categories with transactions this week)
  // and merge in budget/projection data where available
  const categoriesWithTransactions = expenseDetails
    .map((expenseDetail) => {
      const budgetCategory = budgetCategoriesMap.get(expenseDetail.categoryId)

      // If category has a budget, use the budget data
      if (budgetCategory) {
        return {
          ...budgetCategory,
          weeklyTransactions: expenseDetail.transactions,
          weeklyAmount: expenseDetail.amount,
          categoryColor: expenseDetail.color ?? null,
          hasBudget: true,
        }
      }

      // If category doesn't have a budget, create a default structure
      return {
        budgetId: '', // No budget ID
        categoryId: expenseDetail.categoryId,
        categoryName: expenseDetail.categoryName,
        budgetAmount: 0, // No budget set
        spentThisWeek: expenseDetail.amount,
        spentThisMonth: expenseDetail.amount, // Approximate - could be improved
        projectedMonthEnd: null,
        projectedVariance: null,
        pacingStatus: 'INSUFFICIENT_DATA' as const,
        cadence: 'UNKNOWN' as const,
        confidence: 'LOW' as const,
        notes: 'No budget set for this category',
        weeklyTransactions: expenseDetail.transactions,
        weeklyAmount: expenseDetail.amount,
        categoryColor: expenseDetail.color ?? null,
        hasBudget: false,
      }
    })
    .sort((a, b) => {
      // First, sort by whether they have a budget (budgets first)
      if (a.hasBudget !== b.hasBudget) {
        return a.hasBudget ? -1 : 1
      }
      // Then sort by weekly amount (descending)
      return b.weeklyAmount - a.weeklyAmount
    })

  const toggleAllCategories = () => {
    const allOpen = categoriesWithTransactions.every(
      (cat) => openCategories[cat.categoryId]
    )
    if (allOpen) {
      setOpenCategories({})
    } else {
      const allOpenState: Record<string, boolean> = {}
      categoriesWithTransactions.forEach((cat) => {
        allOpenState[cat.categoryId] = true
      })
      setOpenCategories(allOpenState)
    }
  }

  const allCategoriesOpen = categoriesWithTransactions.every(
    (cat) => openCategories[cat.categoryId]
  )

  return (
    <section className="space-y-6">
      <Card className="border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Budget Categories</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {data.daysIntoMonth} of {data.daysInMonth} days into the month
              </p>
            </div>
            {categoriesWithTransactions.length > 0 && (
              <Button variant="outline" size="sm" onClick={toggleAllCategories}>
                {allCategoriesOpen ? 'Collapse All' : 'Expand All'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-4 md:p-6">
          <div
            className={cn(
              'rounded-lg border p-6',
              toneMeta.panelClass,
              summaryTone === 'bad' || summaryTone === 'alarming'
                ? 'text-destructive-foreground'
                : 'text-card-foreground'
            )}
          >
            <div className="flex items-start justify-between gap-6 mb-4">
              <div>
                <p
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide mb-2',
                    toneMeta.accentText
                  )}
                >
                  {toneMeta.label}
                </p>
                <p className="text-sm text-muted-foreground mb-1">
                  {hasProjection
                    ? 'Projected month-end total'
                    : 'Actual month-to-date'}
                </p>
                <p className="text-4xl font-bold">
                  {formatCurrency(projectedTotal, currencyCode)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">
                  Monthly budget
                </p>
                <p className="text-xl font-semibold">
                  {formatCurrency(data.summary.totalBudget, currencyCode)}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-border/50">
              <p
                className={cn(
                  'text-sm font-medium',
                  projectedDelta >= 0
                    ? 'text-destructive'
                    : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                {formatCurrency(Math.abs(projectedDelta), currencyCode)}{' '}
                {projectedDelta >= 0 ? 'over' : 'under'} budget
              </p>
              {toneMeta.helperText && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {toneMeta.helperText}
                </p>
              )}
            </div>
          </div>

          {categoriesWithTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No transactions found for this week.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {categoriesWithTransactions.map((category) => {
                const status =
                  STATUS_META[category.pacingStatus] || STATUS_META.ON_TRACK
                const pct =
                  category.budgetAmount > 0
                    ? Math.min(
                        120,
                        (category.spentThisMonth / category.budgetAmount) * 100
                      )
                    : 0
                const delta =
                  category.budgetAmount > 0
                    ? (category.projectedVariance ??
                      category.spentThisMonth - category.budgetAmount)
                    : null
                const deltaLabel =
                  delta !== null
                    ? delta >= 0
                      ? `${formatCurrency(Math.abs(delta), currencyCode)} over`
                      : `${formatCurrency(Math.abs(delta), currencyCode)} under`
                    : null
                const isOpen = openCategories[category.categoryId] ?? false
                const categoryColor = category.categoryColor
                  ? category.categoryColor
                  : getCategoryColor(
                      category.categoryName,
                      category.categoryColor
                    )

                return (
                  <Collapsible
                    key={category.categoryId}
                    open={isOpen}
                    onOpenChange={(open) =>
                      setOpenCategories((prev) => ({
                        ...prev,
                        [category.categoryId]: open,
                      }))
                    }
                  >
                    <div
                      className={cn(
                        'rounded-xl border bg-card p-5 shadow-sm transition-colors',
                        status.borderClass,
                        isOpen && 'border-primary/40'
                      )}
                    >
                      {/* Header: Category name and status */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="size-4 rounded-full shrink-0"
                            style={{ backgroundColor: categoryColor }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold truncate">
                              {category.categoryName}
                            </p>
                          </div>
                        </div>
                        <Badge className={cn(status.className, 'shrink-0')}>
                          {status.label}
                        </Badge>
                      </div>

                      {/* Spending breakdown */}
                      <div className="mb-5">
                        {/* Main row: This week (left) and Projection (right) */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              This week
                            </p>
                            <p className="text-2xl font-bold">
                              {formatCurrency(
                                category.spentThisWeek,
                                currencyCode
                              )}
                            </p>
                          </div>
                          {category.projectedMonthEnd !== null && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground mb-1">
                                Projected
                              </p>
                              <p
                                className={cn(
                                  'text-lg font-semibold',
                                  delta !== null && delta >= 0
                                    ? 'text-destructive'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                )}
                              >
                                {formatCurrency(
                                  category.projectedMonthEnd,
                                  currencyCode
                                )}
                              </p>
                              {deltaLabel && (
                                <p className="text-xs mt-0.5 text-muted-foreground">
                                  {deltaLabel}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Monthly spend and budget above progress bar */}
                        <div className="flex items-baseline justify-between mb-2">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">
                              {category.budgetAmount > 0
                                ? 'Spent this month'
                                : 'Spent this week'}
                            </p>
                            <p className="text-base font-semibold">
                              {formatCurrency(
                                category.budgetAmount > 0
                                  ? category.spentThisMonth
                                  : category.spentThisWeek,
                                currencyCode
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-0.5">
                              Monthly budget
                            </p>
                            <p className="text-base font-semibold">
                              {category.budgetAmount > 0 ? (
                                formatCurrency(
                                  category.budgetAmount,
                                  currencyCode
                                )
                              ) : (
                                <span className="text-muted-foreground">
                                  Not set
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar - only show if budget is set */}
                        {category.budgetAmount > 0 && (
                          <Progress value={pct} className="h-2" />
                        )}
                      </div>

                      {/* Transaction list trigger */}
                      {category.weeklyTransactions.length > 0 && (
                        <CollapsibleTrigger asChild>
                          <button
                            className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
                            type="button"
                          >
                            <span className="text-sm font-medium">
                              {category.weeklyTransactions.length} transaction
                              {category.weeklyTransactions.length !== 1
                                ? 's'
                                : ''}{' '}
                              this week
                            </span>
                            {isOpen ? (
                              <ChevronUp className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            )}
                          </button>
                        </CollapsibleTrigger>
                      )}

                      {/* Transaction list */}
                      <CollapsibleContent>
                        <div className="mt-4 space-y-2 border-t pt-4">
                          {category.weeklyTransactions.map((transaction) => (
                            <div
                              key={transaction.id}
                              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/30 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">
                                  {transaction.description}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatDateShort(transaction.occurredAt)}
                                </p>
                              </div>
                              <span className="text-sm font-semibold shrink-0 ml-4">
                                {formatCurrency(
                                  transaction.amount,
                                  currencyCode
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
