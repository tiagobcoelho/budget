'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { cn } from '@/lib/utils'
import { Transaction } from '@prisma/client'

interface TransactionListProps {
  transactionIds: string[]
  itemsPerPage?: number
  allowDelete?: boolean
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactionIds,
  itemsPerPage = 10,
  allowDelete = false,
}) => {
  const utils = trpc.useUtils()
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch transactions by IDs
  const transactionsQuery = trpc.transaction.list.useQuery(
    {
      limit: 100,
    },
    {
      enabled: transactionIds.length > 0,
    }
  )

  // Filter to only show transactions that were just created
  const allTransactions =
    transactionsQuery.data?.items.filter((t) =>
      transactionIds.includes(t.id)
    ) || []

  const transactionLookup = useMemo(() => {
    return new Map(
      allTransactions.map((transaction) => [transaction.id, transaction])
    )
  }, [allTransactions])

  // Group transactions: parents with their duplicates, plus standalone transactions
  type TransactionGroup =
    | {
        type: 'group'
        parent: Transaction
        duplicates: Transaction[]
      }
    | {
        type: 'standalone'
        transaction: Transaction
      }

  const transactionGroups = useMemo(() => {
    if (allTransactions.length === 0) {
      return []
    }

    const childMap = new Map<string, Transaction[]>()
    const visited = new Set<string>()
    const groups: TransactionGroup[] = []

    // Build map of duplicates grouped by parent (only for parents in current results)
    for (const transaction of allTransactions) {
      const parentId = transaction.duplicateOfTransactionId
      if (parentId && transactionLookup.has(parentId)) {
        const duplicatesForParent = childMap.get(parentId) ?? []
        duplicatesForParent.push(transaction)
        childMap.set(parentId, duplicatesForParent)
      }
    }

    // Process all transactions to create groups
    for (const transaction of allTransactions) {
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
    for (const transaction of allTransactions) {
      if (!visited.has(transaction.id)) {
        groups.push({
          type: 'standalone',
          transaction: transaction,
        })
        visited.add(transaction.id)
      }
    }

    return groups
  }, [allTransactions, transactionLookup])

  // Calculate pagination based on groups (each group counts as 1 item)
  const totalPages = Math.ceil(transactionGroups.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const displayedGroups = transactionGroups.slice(startIndex, endIndex)

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

  // Reset to page 1 when transactionIds change
  useEffect(() => {
    setCurrentPage(1)
  }, [transactionIds.length])

  // Ensure current page doesn't exceed total pages
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const paginationItems = useMemo(() => {
    const items = []
    const maxVisiblePages = 7

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
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
            href="#"
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
              href="#"
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
            href="#"
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
  }, [currentPage, totalPages])

  if (allTransactions.length === 0) {
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
        {displayedGroups.map((group) => {
          if (group.type === 'group') {
            return (
              <TransactionGroupCard
                key={group.parent.id}
                parentTransaction={group.parent}
                duplicateTransactions={group.duplicates}
                allowDelete={allowDelete}
              />
            )
          } else {
            return (
              <TransactionCard
                key={group.transaction.id}
                transaction={group.transaction}
                allowDelete={allowDelete}
              />
            )
          }
        })}
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
                href="#"
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
                href="#"
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
