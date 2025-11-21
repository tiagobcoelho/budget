'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDateShort } from '@/lib/format'
import { IndividualBudgetCard } from '@/components/budget-card/individual-budget-card'
import { NoBudgetCategoryCard } from '@/components/budget-card/no-budget-category-card'
import { ExpenseCategoryCard } from '@/components/budget-card/budget-card-expense-category-card'
import Link from 'next/link'
import { Transaction } from '@/server/trpc/schemas/transaction.schema'
import { trpc } from '@/lib/trpc/client'

interface BudgetAllocation {
  categoryId: string
  categoryName: string
  allocated: number
  spent: number
  color?: string | null
  transactions: Transaction[]
}

interface CategoryWithoutBudget {
  categoryId: string
  categoryName: string
  transactions: Transaction[]
}

interface ExpenseCategory {
  id: string
  name: string
  spent: number
  hasBudget: boolean
  budgetAmount?: number
  percentUsed?: number
  color?: string | null
  transactions?: Transaction[]
}

interface BudgetCardProps {
  // Core props
  totalAllocated: number
  totalSpent: number
  percentage: number
  remaining: number

  // Budget tracking mode props
  allocations?: BudgetAllocation[]
  categoriesWithoutBudgets?: CategoryWithoutBudget[]

  // Expense breakdown mode props
  categories?: ExpenseCategory[]

  // UI options
  monthName?: string
  title?: string
  lastTransactionDate?: string | Date
  lastTransactionDaysAgo?: number
  showTransactionAlert?: boolean
}

export function BudgetCard({
  totalAllocated,
  totalSpent,
  percentage,
  remaining,
  allocations = [],
  categoriesWithoutBudgets = [],
  categories = [],
  monthName,
  title,
  lastTransactionDate,
  lastTransactionDaysAgo,
  showTransactionAlert = false,
}: BudgetCardProps) {
  const [areAllExpanded, setAreAllExpanded] = useState(false)
  const { data: preferences } = trpc.preference.get.useQuery()
  const currencyCode =
    (preferences?.defaultCurrencyCode as string | undefined) ?? 'USD'

  // Determine mode: budget tracking if allocations exist, otherwise expense breakdown
  const hasBudgets = totalAllocated > 0 && allocations && allocations.length > 0

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'text-destructive'
    if (percentage >= 80) return 'text-warning'
    return 'text-success'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-destructive'
    if (percentage >= 80) return 'bg-warning'
    return 'bg-primary'
  }

  const isOverBudget = percentage >= 100
  const isWarning = percentage >= 80 && percentage < 100
  const needsTransactionUpdate =
    showTransactionAlert &&
    lastTransactionDaysAgo !== undefined &&
    lastTransactionDaysAgo >= 2

  const toggleAll = () => {
    setAreAllExpanded(!areAllExpanded)
  }

  const formatLastUpdated = (dateString?: string | Date) => {
    if (!dateString) return 'No transactions yet'

    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    )

    if (diffInHours < 1) return 'Updated just now'
    if (diffInHours < 24) return `Updated ${diffInHours}h ago`
    if (diffInHours < 48) return 'Updated yesterday'

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `Updated ${diffInDays}d ago`

    return `Updated on ${new Date(date).toLocaleDateString()}`
  }

  // Budget Tracking Mode
  if (hasBudgets) {
    return (
      <Card
        className={cn(
          isOverBudget && 'border-destructive/40',
          isWarning && 'border-warning/40'
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {monthName ? `${monthName} Budget` : 'Budget Overview'}
            <Badge variant="secondary" className="font-normal">
              {formatLastUpdated(lastTransactionDate)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsTransactionUpdate && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 shrink-0 text-amber-500" />
                <div className="flex-1">
                  <p className="mb-1 text-sm font-medium text-amber-600 dark:text-amber-500">
                    Time to update your budget
                  </p>
                  <p className="mb-3 text-sm text-muted-foreground">
                    You haven&apos;t added transactions in{' '}
                    {lastTransactionDaysAgo} days. Add them now to keep your
                    budget accurate.
                  </p>
                  <Button
                    size="sm"
                    asChild
                    variant="outline"
                    className="border-amber-500/30 hover:bg-amber-500/10"
                  >
                    <Link href="/transactions/add">Add Transactions</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Spending</p>
              <p className="text-3xl font-bold">
                {formatCurrency(totalSpent, currencyCode)}
                <span className="text-lg font-normal text-muted-foreground">
                  {' '}
                  / {formatCurrency(totalAllocated, currencyCode)}
                </span>
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                {percentage >= 100 ? (
                  <TrendingUp className="size-5 text-destructive" />
                ) : (
                  <TrendingDown className="size-5 text-success" />
                )}
                <p
                  className={cn(
                    'text-2xl font-bold',
                    getStatusColor(percentage)
                  )}
                >
                  {percentage.toFixed(0)}%
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {remaining >= 0
                  ? `${formatCurrency(remaining, currencyCode)} left`
                  : `${formatCurrency(Math.abs(remaining), currencyCode)} over`}
              </p>
            </div>
          </div>

          <Progress
            value={Math.min(percentage, 100)}
            className="h-4"
            indicatorClassName={getProgressColor(percentage)}
          />

          {isOverBudget && (
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive">
                You&apos;ve exceeded your budget by{' '}
                {formatCurrency(Math.abs(remaining), currencyCode)}
              </p>
            </div>
          )}

          {isWarning && !isOverBudget && (
            <div className="rounded-lg bg-warning/10 p-3">
              <p className="text-sm font-medium text-warning">
                You&apos;re close to your budget limit.{' '}
                {formatCurrency(remaining, currencyCode)} remaining.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Category Budgets
            </h4>
            {(allocations.length > 0 ||
              categoriesWithoutBudgets.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                className="h-8 gap-1.5"
              >
                {areAllExpanded ? (
                  <>
                    <ChevronUp className="size-3.5" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" />
                    Expand All
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {allocations.map((allocation) => (
              <IndividualBudgetCard
                key={allocation.categoryId}
                categoryName={allocation.categoryName}
                allocated={allocation.allocated}
                spent={allocation.spent}
                totalSpent={totalSpent}
                transactions={allocation.transactions}
                expandAll={areAllExpanded}
                currencyCode={currencyCode}
              />
            ))}
            {categoriesWithoutBudgets.map((category) => (
              <NoBudgetCategoryCard
                key={category.categoryId}
                categoryName={category.categoryName}
                transactions={category.transactions}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Expense Breakdown Mode
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {title
              ? title
              : monthName
                ? `${monthName} Expenses`
                : 'Your Expenses'}
          </CardTitle>
          {lastTransactionDate && (
            <p className="text-xs text-muted-foreground">
              Last transaction:{' '}
              {lastTransactionDaysAgo !== undefined
                ? `${lastTransactionDaysAgo} day${
                    lastTransactionDaysAgo !== 1 ? 's' : ''
                  } ago`
                : formatDateShort(lastTransactionDate)}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Total Spent
            </p>
            <p className="mt-1 text-3xl font-bold">
              {formatCurrency(totalSpent, currencyCode)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Categories
            </p>
            <p className="mt-1 text-3xl font-bold">{categories.length}</p>
          </div>
        </div>

        {/* Category Breakdown */}
        {categories.length > 0 && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Category Breakdown</h3>
              <div className="flex items-center gap-2">
                {categories.some(
                  (cat) => cat.transactions && cat.transactions.length > 0
                ) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAll}
                    className="h-8 gap-1.5"
                  >
                    {areAllExpanded ? (
                      <>
                        <ChevronUp className="size-3.5" />
                        Collapse All
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-3.5" />
                        Expand All
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[...categories]
                .sort((a, b) => b.spent - a.spent)
                .map((category) => (
                  <ExpenseCategoryCard
                    key={category.id}
                    categoryId={category.id}
                    categoryName={category.name}
                    color={category.color}
                    spent={category.spent}
                    totalExpenses={totalSpent}
                    transactions={
                      category.transactions as unknown as Transaction[]
                    }
                    expandAll={areAllExpanded}
                    currencyCode={currencyCode}
                  />
                ))}
            </div>
          </div>
        )}

        {categories.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No spending data available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
