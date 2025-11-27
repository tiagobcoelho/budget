'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, AlertTriangle, Lightbulb, ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { BudgetCard } from '@/components/budget-card'
import { RequiredActionsAlert } from '@/components/required-actions-alert'
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

      // Navigate to the report page
      router.push(`/reports/${report.id}`)
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

  const needsTransactionUpdate =
    lastTransactionInfo.daysAgo !== undefined &&
    lastTransactionInfo.daysAgo >= 2

  // Parse report narrative data
  const reportData = useMemo(() => {
    if (!latestReport || !latestReport.data) return null

    const isInitial = latestReport.isInitial
    const period = latestReport.period
    const behaviorPatterns = latestReport.data.llm?.behaviorPatterns ?? []
    const risks = latestReport.data.llm?.risks ?? []
    const opportunities = latestReport.data.llm?.opportunities ?? []
    const potentialIssues = latestReport.data.llm?.potentialIssues ?? []
    const recommendedActions = latestReport.data.llm?.recommendedActions ?? []

    return {
      behaviorPatterns,
      risks,
      opportunities,
      potentialIssues,
      recommendedActions,
      isInitial,
      period,
    }
  }, [latestReport])

  const hasNoBudgets = !budgetsData || budgetsData.length === 0

  const hasHighlights = useMemo(() => {
    if (!reportData) return false
    return (
      (reportData.risks?.length ?? 0) > 0 ||
      (reportData.opportunities?.length ?? 0) > 0
    )
  }, [reportData])

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Required Actions */}
        {(hasReportOpportunities || needsTransactionUpdate) && (
          <RequiredActionsAlert
            reportOpportunities={reportOpportunities}
            opportunitiesLoading={opportunitiesLoading}
            onGenerateOpportunity={handleGenerateOpportunity}
            isOpportunityPending={isOpportunityPending}
            showTransactionAlert={needsTransactionUpdate}
            lastTransactionDaysAgo={lastTransactionInfo.daysAgo}
          />
        )}

        {/* Latest Report Highlights */}
        {reportData && hasHighlights && (
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
                        ? "Last Week's Watchlist"
                        : reportData.isInitial
                          ? 'Initial report highlights'
                          : "Last Month's Highlights"}
                    </p>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/reports/${latestReport?.id}`}>
                        View Full Report
                      </Link>
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="pt-4 md:pt-0 border-primary/10">
                      <div className="flex items-center gap-2">
                        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-400">
                          <AlertTriangle className="size-4 " /> Top risks
                        </p>
                      </div>
                      {reportData.risks.length > 0 ? (
                        <ul className="space-y-3">
                          {reportData.risks.map((risk) => (
                            <li key={risk.title}>
                              <Collapsible className="rounded-lg border border-amber-400/10 bg-amber-400/5 p-2">
                                <CollapsibleTrigger className="w-full flex items-center gap-2 focus:outline-none group cursor-pointer">
                                  <p className="text-left text-sm font-semibold">
                                    {risk.title}
                                  </p>
                                  <ChevronRight className="size-3.5 text-amber-400 ml-auto group-data-[state=open]:rotate-90 transition-transform duration-200" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="pt-2 text-xs text-muted-foreground">
                                  {risk.description}
                                </CollapsibleContent>
                              </Collapsible>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No risks identified in this period.
                        </p>
                      )}
                    </div>

                    <div className="border-l-0 border-t pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0 border-primary/10">
                      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
                        <Lightbulb className="size-3.5 text-primary" />
                        Opportunities
                      </p>
                      {reportData.opportunities.length > 0 ? (
                        <ul className="space-y-3">
                          {reportData.opportunities.map((opportunity) => (
                            <li key={opportunity.title}>
                              <Collapsible className="rounded-lg border border-primary/10 bg-primary/5 p-2">
                                <CollapsibleTrigger className="w-full flex items-center gap-2 focus:outline-none group cursor-pointer">
                                  <p className="text-left text-sm font-semibold">
                                    {opportunity.title}
                                  </p>
                                  <ChevronRight className="size-3.5 text-primary ml-auto group-data-[state=open]:rotate-90 transition-transform duration-200" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="pt-2 text-xs text-muted-foreground">
                                  {opportunity.description}
                                </CollapsibleContent>
                              </Collapsible>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No opportunities surfaced for this report.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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
          />
        )}
      </div>
    </DashboardLayout>
  )
}
