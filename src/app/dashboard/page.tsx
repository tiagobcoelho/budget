'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { BudgetCard } from '@/components/budget-card'
import { endOfMonth, formatISO, startOfMonth } from 'date-fns'
import { Transaction } from '@/server/trpc/schemas/transaction.schema'
import { toast } from 'sonner'

export default function DashboardPage() {
  const router = useRouter()
  const utils = trpc.useUtils()
  const [pendingReportKey, setPendingReportKey] = useState<string | null>(null)

  // Get date ranges for current month
  const { currentMonth } = useMemo(() => {
    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)

    return {
      currentMonth: {
        from: formatISO(currentMonthStart),
        to: formatISO(currentMonthEnd),
      },
    }
  }, [])

  // Fetch budgets with transactions for current month
  const { data: budgetsData } = trpc.budget.listWithTransactions.useQuery({
    from: currentMonth.from,
    to: currentMonth.to,
  })

  // Fetch all expense transactions for current month to find categories without budgets
  const { data: allExpensesData } = trpc.transaction.list.useQuery({
    from: currentMonth.from,
    to: currentMonth.to,
    limit: 1000,
  })

  // Fetch latest transaction for last transaction date and days ago
  const { data: latestTransactionData } = trpc.transaction.getLatest.useQuery()

  // Fetch latest completed report for insights and recommendations
  const { data: reports } = trpc.report.list.useQuery({ status: 'COMPLETED' })
  const latestReport = reports?.[0] // Get the first (most recent) report

  const { data: reportOpportunities, isLoading: opportunitiesLoading } =
    trpc.report.getOpportunities.useQuery()

  const hasReportOpportunities =
    !!reportOpportunities &&
    (reportOpportunities.weekly || reportOpportunities.monthly.length > 0)

  const generateReport = trpc.report.generate.useMutation({
    onError: (error) => {
      toast.error(error.message || 'Failed to start report generation')
    },
  })

  const formatOpportunityLabel = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const monthFormatter = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    })
    const yearFormatter = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
    })
    const sameMonth =
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear()
    const sameYear = start.getFullYear() === end.getFullYear()

    if (sameMonth) {
      return `${monthFormatter.format(start)} – ${end.getDate()}`
    }

    if (sameYear) {
      return `${monthFormatter.format(start)} – ${monthFormatter.format(end)}`
    }

    return `${monthFormatter.format(start)} ${yearFormatter.format(
      start
    )} – ${monthFormatter.format(end)} ${yearFormatter.format(end)}`
  }

  const handleGenerateOpportunity = async (params: {
    period: 'MONTHLY' | 'WEEKLY'
    startDate: string
    endDate: string
  }) => {
    const key = `${params.period}-${params.startDate}`
    setPendingReportKey(key)
    try {
      const report = await generateReport.mutateAsync({
        period: params.period,
        startDate: params.startDate,
        endDate: params.endDate,
      })

      toast.success('Report generation started')

      const url =
        params.period === 'WEEKLY'
          ? '/api/reports/generate/weekly'
          : '/api/reports/generate/monthly'

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to start background generation')
      }

      await Promise.all([
        utils.report.getOpportunities.invalidate(),
        utils.report.list.invalidate(),
      ])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate report'
      toast.error(message)
    } finally {
      setPendingReportKey(null)
    }
  }

  const isOpportunityPending = (period: string, startDate: string) =>
    pendingReportKey === `${period}-${startDate}` || generateReport.isPending

  // Transform budget data for BudgetCard
  const budgetCardData = useMemo(() => {
    if (!budgetsData || budgetsData.length === 0) {
      return {
        totalAllocated: 0,
        totalSpent: 0,
        percentage: 0,
        remaining: 0,
        allocations: [],
      }
    }

    // Calculate totals
    const totalAllocated = budgetsData.reduce(
      (sum, b) => sum + Number(b.amount),
      0
    )
    const totalSpent = budgetsData.reduce((sum, b) => sum + (b.spent || 0), 0)
    const remaining = totalAllocated - totalSpent
    const percentage =
      totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0

    const allocations =
      budgetsData.map((budget) => ({
        categoryId: budget.categoryId,
        categoryName: budget.category?.name || 'Unknown',
        allocated: Number(budget.amount),
        spent: budget.spent,
        transactions: budget.transactions as unknown as Transaction[],
      })) || []

    return {
      totalAllocated,
      totalSpent,
      percentage,
      remaining,
      allocations,
    }
  }, [budgetsData])

  // Find categories without budgets
  const categoriesWithoutBudgets = useMemo(() => {
    if (!allExpensesData?.items || !budgetsData) return []

    // Get category IDs that have budgets
    const categoriesWithBudgets = new Set(budgetsData.map((b) => b.categoryId))

    // Group expense transactions by category
    const categoryMap = new Map<
      string,
      {
        categoryId: string
        categoryName: string
        transactions: Transaction[]
      }
    >()

    allExpensesData.items
      .filter((t) => t.type === 'EXPENSE' && t.categoryId)
      .forEach((transaction) => {
        const categoryId = transaction.categoryId!
        // Only include categories without budgets
        if (!categoriesWithBudgets.has(categoryId)) {
          const existing = categoryMap.get(categoryId) || {
            categoryId,
            categoryName: transaction.category?.name || 'Uncategorized',
            transactions: [],
          }

          existing.transactions.push(transaction as unknown as Transaction)

          categoryMap.set(categoryId, existing)
        }
      })

    // Filter out categories with no transactions and sort by total amount
    return Array.from(categoryMap.values())
      .filter((cat) => cat.transactions.length > 0)
      .sort((a, b) => {
        const aTotal = a.transactions.reduce((sum, t) => sum + t.amount, 0)
        const bTotal = b.transactions.reduce((sum, t) => sum + t.amount, 0)
        return bTotal - aTotal
      })
  }, [allExpensesData, budgetsData])

  // Calculate last transaction date and days ago
  const lastTransactionInfo = useMemo(() => {
    if (!latestTransactionData) {
      return { date: undefined, daysAgo: undefined }
    }

    const lastTransactionDate = new Date(latestTransactionData.occurredAt)
    const now = new Date()
    const diffInMs = now.getTime() - lastTransactionDate.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    return {
      date: latestTransactionData.occurredAt,
      daysAgo: diffInDays,
    }
  }, [latestTransactionData])

  // Parse report insights and recommendations
  const reportData = useMemo(() => {
    if (!latestReport || !latestReport.data) return null

    const isInitial = latestReport.isInitial
    const period = latestReport.period
    const summary = latestReport.data.llm?.summary
    const recommendations = latestReport.data.llm?.suggestionsText

    return {
      summary,
      recommendations,
      isInitial,
      period,
    }
  }, [latestReport])

  const hasNoBudgets = !budgetsData || budgetsData.length === 0

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Latest Report Summary */}
        {reportData && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="size-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {reportData.period === 'WEEKLY'
                        ? "Last Week's Summary"
                        : "Last Month's Summary"}
                    </p>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/reports/${latestReport?.id}`}>
                        View Full Report
                      </Link>
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {!!reportData.summary?.length && (
                      <div>
                        <ul className="list-disc space-y-2 text-sm">
                          {reportData.summary.map((summaryItem, index) => (
                            <li key={index}>{summaryItem}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!!reportData.recommendations?.length && (
                      <div className="border-l-0 border-t pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0 border-primary/10">
                        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
                          <ArrowRight className="size-3.5" />
                          {reportData.period === 'WEEKLY'
                            ? "Last Week's Recommendations"
                            : "Last Month's Recommendations"}
                        </p>
                        <ul className="list-disc space-y-2 text-sm">
                          {reportData.recommendations.map(
                            (recommendation, index) => (
                              <li key={index} className="ml-4">
                                {recommendation}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Opportunities */}
        {hasReportOpportunities && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-4 p-4">
              <div>
                <p className="text-sm font-semibold text-primary">
                  Reports ready to generate
                </p>
                <p className="text-sm text-muted-foreground">
                  {opportunitiesLoading
                    ? 'Checking for available reports...'
                    : 'All transactions are reconciled — generate insights with one tap.'}
                </p>
              </div>

              {reportOpportunities?.monthly.length ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Monthly
                  </p>
                  <div className="space-y-2">
                    {reportOpportunities.monthly.map((opportunity) => (
                      <div
                        key={`monthly-${opportunity.startDate}`}
                        className="rounded-lg border border-primary/10 bg-background/70 p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-primary">
                              {formatOpportunityLabel(
                                opportunity.startDate,
                                opportunity.endDate
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Covers{' '}
                              {new Date(
                                opportunity.startDate
                              ).toLocaleDateString()}{' '}
                              –{' '}
                              {new Date(
                                opportunity.endDate
                              ).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {opportunity.transactionCount} transactions
                              reviewed
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleGenerateOpportunity({
                                period: 'MONTHLY',
                                startDate: opportunity.startDate,
                                endDate: opportunity.endDate,
                              })
                            }
                            disabled={isOpportunityPending(
                              'MONTHLY',
                              opportunity.startDate
                            )}
                          >
                            Generate monthly report
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {reportOpportunities?.weekly ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Weekly
                  </p>
                  <div className="rounded-lg border border-primary/10 bg-background/70 p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-primary">
                          {formatOpportunityLabel(
                            reportOpportunities.weekly.startDate,
                            reportOpportunities.weekly.endDate
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Covers{' '}
                          {new Date(
                            reportOpportunities.weekly.startDate
                          ).toLocaleDateString()}{' '}
                          –{' '}
                          {new Date(
                            reportOpportunities.weekly.endDate
                          ).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reportOpportunities.weekly.transactionCount}{' '}
                          transactions reviewed
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleGenerateOpportunity({
                            period: 'WEEKLY',
                            startDate: reportOpportunities.weekly!.startDate,
                            endDate: reportOpportunities.weekly!.endDate,
                          })
                        }
                        disabled={isOpportunityPending(
                          'WEEKLY',
                          reportOpportunities.weekly.startDate
                        )}
                      >
                        Generate weekly report
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Budgets Section */}
        {hasNoBudgets ? (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10 p-12 text-center">
            <h3 className="mb-2 text-lg font-semibold">
              No active budgets yet
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Let&apos;s set some based on your latest report
            </p>
            <Button onClick={() => router.push('/budgets')}>
              Create budgets
            </Button>
          </div>
        ) : (
          <BudgetCard
            totalAllocated={budgetCardData.totalAllocated}
            totalSpent={budgetCardData.totalSpent}
            percentage={budgetCardData.percentage}
            remaining={budgetCardData.remaining}
            lastTransactionDate={lastTransactionInfo.date}
            lastTransactionDaysAgo={lastTransactionInfo.daysAgo}
            allocations={budgetCardData.allocations}
            categoriesWithoutBudgets={categoriesWithoutBudgets}
            showTransactionAlert={true}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
