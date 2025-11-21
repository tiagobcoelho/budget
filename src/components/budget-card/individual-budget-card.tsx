'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import { Progress } from '@/components/ui/progress'
import { ChevronDown, TrendingDown } from 'lucide-react'
import { CategoryDot } from '@/components/budget-card/category-dot'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import { Transaction } from '@/server/trpc/schemas/transaction.schema'
import { trpc } from '@/lib/trpc/client'

const TRANSACTIONS_PER_PAGE = 5

interface IndividualBudgetCardProps {
  categoryName: string
  allocated: number
  spent: number
  totalSpent: number
  transactions: Transaction[]
  expandAll?: boolean
  currencyCode?: string
}

export function IndividualBudgetCard({
  categoryName,
  allocated,
  spent,
  totalSpent,
  transactions,
  expandAll,
  currencyCode,
}: IndividualBudgetCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const percentage = (spent / allocated) * 100
  const remaining = allocated - spent
  const percentageOfTotal = totalSpent > 0 ? (spent / totalSpent) * 100 : 0
  const { data: preferences } = trpc.preference.get.useQuery()
  const finalCurrencyCode =
    currencyCode ??
    (preferences?.defaultCurrencyCode as string | undefined) ??
    'USD'

  useEffect(() => {
    if (expandAll !== undefined) {
      setIsOpen(expandAll)
    }
  }, [expandAll])

  // Reset to page 1 when collapsible closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentPage(1)
    }
  }, [isOpen])

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

  // Sort transactions by date (newest first)
  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      ),
    [transactions]
  )

  // Calculate pagination
  const totalPages = Math.ceil(
    sortedTransactions.length / TRANSACTIONS_PER_PAGE
  )
  const startIndex = (currentPage - 1) * TRANSACTIONS_PER_PAGE
  const endIndex = startIndex + TRANSACTIONS_PER_PAGE
  const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex)

  const handlePageClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    page: number
  ) => {
    e.preventDefault()
    setCurrentPage(page)
  }

  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    const pages: number[] = []
    const maxVisiblePages = 7 // Show up to 7 page numbers

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show first page, last page, current page, and pages around current
      if (currentPage <= 3) {
        // Near the start
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push(-1) // Ellipsis
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push(1)
        pages.push(-1) // Ellipsis
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // In the middle
        pages.push(1)
        pages.push(-1) // Ellipsis
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push(-1) // Ellipsis
        pages.push(totalPages)
      }
    }

    return pages
  }, [currentPage, totalPages])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card
        className={cn(
          'transition-colors',
          isOpen && 'border-primary/40 bg-muted/30'
        )}
      >
        <CardContent className="p-4">
          <CollapsibleTrigger
            className="group flex w-full flex-col gap-3 text-left cursor-pointer"
            disabled={transactions.length === 0}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CategoryDot category={categoryName} />
                <h3 className="text-sm font-semibold">{categoryName}</h3>
              </div>
              {transactions.length > 0 && (
                <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <div className="flex flex-col gap-1">
                  <span
                    className={cn(
                      'text-lg font-bold',
                      getStatusColor(percentage)
                    )}
                  >
                    {formatCurrency(spent, finalCurrencyCode)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {percentageOfTotal.toFixed(1)}% of total spending
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">
                    of {formatCurrency(allocated, finalCurrencyCode)}
                  </span>
                </div>
              </div>
              <Progress
                value={percentage}
                className="h-2"
                indicatorClassName={getProgressColor(percentage)}
              />
              <div className="flex items-center justify-between text-xs">
                <span className={cn('font-medium', getStatusColor(percentage))}>
                  {percentage.toFixed(0)}% used
                </span>
                <span className="text-muted-foreground">
                  {remaining >= 0
                    ? `${formatCurrency(remaining, finalCurrencyCode)} left`
                    : `${formatCurrency(Math.abs(remaining), finalCurrencyCode)} over`}
                </span>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            {transactions.length > 0 ? (
              <div className="mt-4 space-y-3 border-t pt-3">
                <div className="space-y-1">
                  {paginatedTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between rounded px-2 py-2 hover:bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingDown className="size-3 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium">
                            {transaction.description || 'Transaction'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(transaction.occurredAt)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold">
                        {formatCurrency(Number(transaction.amount), finalCurrencyCode)}
                      </span>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center border-t pt-3">
                    <Pagination>
                      <PaginationContent>
                        {pageNumbers.map((page, index) => (
                          <PaginationItem key={index}>
                            {page === -1 ? (
                              <PaginationEllipsis />
                            ) : (
                              <PaginationLink
                                href="#"
                                onClick={(e) => handlePageClick(e, page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        ))}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 border-t pt-3 text-center text-xs text-muted-foreground">
                No transactions yet
              </p>
            )}
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  )
}
