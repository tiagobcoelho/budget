'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'
import { TransactionCard } from './transactions-card'
import { TransactionGroupCard } from './transaction-group-card'
import { Transaction } from '@prisma/client'
import type { ListTransactionsInput } from '@/server/trpc/schemas/transaction.schema'
import { Skeleton } from '@/components/ui/skeleton'

type TransactionWithRelations = Transaction & {
  duplicateOf?: Pick<
    Transaction,
    'id' | 'description' | 'amount' | 'occurredAt'
  > | null
  user?: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    imageUrl: string | null
  } | null
}

type TransactionListFilters = Omit<ListTransactionsInput, 'limit' | 'page'>

interface TransactionListProps {
  itemsPerPage?: number
  filters?: TransactionListFilters
}

const TransactionListSkeleton: React.FC<{ count: number }> = ({ count }) => {
  const skeletonCount = Math.max(count, 1)
  return (
    <div className="space-y-3">
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <Card key={`transaction-skeleton-${index}`} className="overflow-hidden">
          <CardContent className="space-y-4 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="ml-auto h-5 w-24" />
                <Skeleton className="ml-auto h-3 w-20" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export const TransactionList: React.FC<TransactionListProps> = ({
  itemsPerPage = 10,
  filters,
}) => {
  const utils = trpc.useUtils()
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = Math.min(itemsPerPage, 100)

  const queryInput = useMemo<TransactionListFilters>(
    () => ({
      ...(filters ?? {}),
    }),
    [filters]
  )

  const filtersKey = useMemo(() => JSON.stringify(queryInput), [queryInput])

  const { data, isLoading } = trpc.transaction.list.useQuery({
    ...queryInput,
    limit: pageSize,
    page: currentPage,
  })

  const pageTransactions = useMemo(() => data?.items ?? [], [data?.items])
  const totalTransactions = data?.total ?? 0
  const totalPages =
    totalTransactions > 0 ? Math.ceil(totalTransactions / pageSize) : 0

  const isInitialLoading = isLoading
  const isCurrentPageLoading = isLoading

  const transactionLookup = useMemo(() => {
    return new Map(
      pageTransactions.map((transaction) => [transaction.id, transaction])
    )
  }, [pageTransactions])

  // Group transactions: parents with their duplicates, plus standalone transactions
  type TransactionGroup =
    | {
        type: 'group'
        parent: TransactionWithRelations
        duplicates: TransactionWithRelations[]
      }
    | {
        type: 'standalone'
        transaction: TransactionWithRelations
      }

  const transactionGroups = useMemo(() => {
    if (pageTransactions.length === 0) {
      return []
    }

    const childMap = new Map<string, TransactionWithRelations[]>()
    const visited = new Set<string>()
    const groups: TransactionGroup[] = []

    // Build map of duplicates grouped by parent (only for parents in current results)
    for (const transaction of pageTransactions) {
      const parentId = transaction.duplicateOfTransactionId
      if (parentId && transactionLookup.has(parentId)) {
        const duplicatesForParent = childMap.get(parentId) ?? []
        duplicatesForParent.push(transaction)
        childMap.set(parentId, duplicatesForParent)
      }
    }

    // Process all transactions to create groups
    for (const transaction of pageTransactions) {
      if (visited.has(transaction.id)) {
        continue
      }

      const parentId = transaction.duplicateOfTransactionId
      const hasParentInResults = parentId && transactionLookup.has(parentId)

      // Skip if this is a duplicate whose parent is in results (will be handled with parent)
      if (hasParentInResults) {
        continue
      }

      // Check if this transaction has duplicates
      const duplicates = childMap.get(transaction.id)
      if (duplicates && duplicates.length > 0) {
        // Create a group with parent and duplicates
        groups.push({
          type: 'group',
          parent: transaction,
          duplicates: duplicates,
        })
        visited.add(transaction.id)
        for (const duplicate of duplicates) {
          visited.add(duplicate.id)
        }
      } else {
        // Standalone transaction
        groups.push({
          type: 'standalone',
          transaction: transaction,
        })
        visited.add(transaction.id)
      }
    }

    // Add orphaned transactions (duplicates whose parent is not in results)
    for (const transaction of pageTransactions) {
      if (!visited.has(transaction.id)) {
        groups.push({
          type: 'standalone',
          transaction: transaction,
        })
        visited.add(transaction.id)
      }
    }

    return groups
  }, [pageTransactions, transactionLookup])

  const displayedGroups = transactionGroups

  // Find unreviewed transactions on current page
  const unreviewedTransactions = useMemo(() => {
    const transactions: Transaction[] = []
    for (const group of displayedGroups) {
      if (group.type === 'group') {
        if (!group.parent.reviewed) transactions.push(group.parent)
        for (const duplicate of group.duplicates) {
          if (!duplicate.reviewed) transactions.push(duplicate)
        }
      } else {
        if (!group.transaction.reviewed) transactions.push(group.transaction)
      }
    }
    return transactions
  }, [displayedGroups])

  const markAsReviewed = trpc.transaction.markAsReviewed.useMutation({
    onSuccess: (count) => {
      toast.success(
        `Marked ${count} transaction${count !== 1 ? 's' : ''} as reviewed`
      )
      utils.transaction.list.invalidate()
      utils.report.getOpportunities.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark transactions as reviewed')
    },
  })

  const handleMarkAllAsReviewed = () => {
    const unreviewedIds = unreviewedTransactions.map((t) => t.id)
    if (unreviewedIds.length > 0) {
      markAsReviewed.mutate({ transactionIds: unreviewedIds })
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [filtersKey])

  // Ensure current page doesn't exceed total pages
  // Only validate when we're not loading to prevent resetting during page navigation
  useEffect(() => {
    // Skip validation during loading - wait for the query to complete
    if (isLoading) {
      return
    }

    // If we have data and current page exceeds total pages, adjust it
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    } else if (totalPages === 0 && currentPage !== 1 && data) {
      // Only reset to page 1 if we have data confirming there are no pages
      // (not just because data is still loading)
      setCurrentPage(1)
    }
  }, [totalPages, currentPage, isLoading, data])

  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 1 || page === currentPage) {
        return
      }
      setCurrentPage(page)
    },
    [currentPage]
  )

  const paginationItems = useMemo(() => {
    const items = []
    const maxVisiblePages = 7

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={(e) => {
                e.preventDefault()
                handlePageChange(i)
              }}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }
    } else {
      // Show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={(e) => {
              e.preventDefault()
              handlePageChange(1)
            }}
            isActive={currentPage === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>
      )

      // Show ellipsis if current page is far from start
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        )
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={(e) => {
                e.preventDefault()
                handlePageChange(i)
              }}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }

      // Show ellipsis if current page is far from end
      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        )
      }

      // Show last page
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={(e) => {
              e.preventDefault()
              handlePageChange(totalPages)
            }}
            isActive={currentPage === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      )
    }

    return items
  }, [currentPage, totalPages, handlePageChange])

  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        <TransactionListSkeleton count={pageSize} />
      </div>
    )
  }

  if (totalTransactions === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No transactions to display
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {isCurrentPageLoading ? (
          <TransactionListSkeleton count={pageSize} />
        ) : (
          displayedGroups.map((group) => {
            if (group.type === 'group') {
              return (
                <TransactionGroupCard
                  key={group.parent.id}
                  parentTransaction={group.parent}
                  duplicateTransactions={group.duplicates}
                />
              )
            } else {
              return (
                <TransactionCard
                  key={group.transaction.id}
                  transaction={group.transaction}
                />
              )
            }
          })
        )}
      </div>

      {unreviewedTransactions.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={handleMarkAllAsReviewed}
            disabled={markAsReviewed.isPending}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {unreviewedTransactions.length === 1
              ? 'Mark as reviewed'
              : `Mark ${unreviewedTransactions.length} as reviewed`}
          </Button>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={(e) => {
                  e.preventDefault()
                  if (currentPage > 1) {
                    handlePageChange(currentPage - 1)
                  }
                }}
                className={
                  currentPage === 1
                    ? 'pointer-events-none opacity-50'
                    : 'cursor-pointer'
                }
              />
            </PaginationItem>
            {paginationItems}
            <PaginationItem>
              <PaginationNext
                onClick={(e) => {
                  e.preventDefault()
                  if (currentPage < totalPages) {
                    handlePageChange(currentPage + 1)
                  }
                }}
                className={
                  currentPage === totalPages
                    ? 'pointer-events-none opacity-50'
                    : 'cursor-pointer'
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
