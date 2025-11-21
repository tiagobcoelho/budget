'use client'

import { useRef, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Edit2, CheckCircle, Trash, Link2Off } from 'lucide-react'
import { TransactionForm, TransactionFormValues } from './transaction-form'
import { cn } from '@/lib/utils'
import { TransactionType, Transaction } from '@prisma/client'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/format'

// Helper function to check if a transaction is incomplete
export const isTransactionIncomplete = (transaction: Transaction): boolean => {
  if (transaction.type === 'EXPENSE') {
    return !transaction.fromAccountId
  }
  if (transaction.type === 'INCOME') {
    return !transaction.toAccountId
  }
  if (transaction.type === 'TRANSFER') {
    return !transaction.fromAccountId || !transaction.toAccountId
  }
  if (transaction.type === TransactionType.TRANSFER) {
    return !transaction.fromAccountId || !transaction.toAccountId
  }
  return false
}

type TransactionWithRelations = Transaction & {
  duplicateOf?: Pick<
    Transaction,
    'id' | 'description' | 'amount' | 'occurredAt'
  > | null
}

interface TransactionCardProps {
  transaction: TransactionWithRelations
  allowDelete?: boolean
  noCardWrapper?: boolean
  showDuplicateActions?: boolean
  onUnlink?: () => void
  isUnlinking?: boolean
}

export function TransactionCard({
  transaction,
  allowDelete = false,
  noCardWrapper = false,
  showDuplicateActions = false,
  onUnlink,
  isUnlinking = false,
}: TransactionCardProps) {
  const formRef = useRef<HTMLDivElement>(null)
  const utils = trpc.useUtils()
  const [isEditing, setIsEditing] = useState(false)

  // Fetch categories and accounts
  const { data: categories = [] } = trpc.category.list.useQuery()
  const { data: accounts = [] } = trpc.account.list.useQuery()
  const { data: preferences } = trpc.preference.get.useQuery()
  const currencyCode =
    (preferences?.defaultCurrencyCode as string | undefined) ?? 'USD'

  const markAsReviewed = trpc.transaction.markAsReviewed.useMutation({
    onSuccess: () => {
      utils.transaction.list.invalidate()
      utils.report.getOpportunities.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark transaction as reviewed')
    },
  })

  const updateTransaction = trpc.transaction.update.useMutation({
    onSuccess: () => {
      toast.success('Transaction updated successfully')
      utils.transaction.list.invalidate()
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update transaction')
    },
  })

  const deleteTransaction = trpc.transaction.delete.useMutation({
    onSuccess: () => {
      toast.success('Transaction deleted successfully')
      utils.transaction.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete transaction')
    },
  })

  const handleMarkAsReviewed = () => {
    markAsReviewed.mutate({ transactionIds: [transaction.id] })
  }

  const handleFormSubmit = async (data: TransactionFormValues) => {
    updateTransaction.mutate({
      id: transaction.id,
      ...data,
      reviewed: true,
      occurredAt: new Date(data.occurredAt).toISOString(),
    })
  }

  const handleDelete = () => {
    // Always allow deletion for duplicates, or if allowDelete is true
    if (showDuplicateActions || allowDelete) {
      deleteTransaction.mutate({ id: transaction.id })
    }
  }

  // Memoized computed values
  const categoryName = useMemo(() => {
    if (!transaction.categoryId) return 'Uncategorized'
    const category = categories.find((c) => c.id === transaction.categoryId)
    return category?.name || 'Uncategorized'
  }, [transaction.categoryId, categories])

  const fromAccountName = useMemo(() => {
    if (!transaction.fromAccountId) return 'No account'
    const account = accounts.find((a) => a.id === transaction.fromAccountId)
    return account?.name || 'No account'
  }, [transaction.fromAccountId, accounts])

  const toAccountName = useMemo(() => {
    if (!transaction.toAccountId) return 'No account'
    const account = accounts.find((a) => a.id === transaction.toAccountId)
    return account?.name || 'No account'
  }, [transaction.toAccountId, accounts])

  const formattedAmount = useMemo(() => {
    const sign =
      transaction.type === 'EXPENSE'
        ? '-'
        : transaction.type === 'INCOME'
          ? '+'
          : ''
    return `${sign}${formatCurrency(Math.abs(Number(transaction.amount)), currencyCode)}`
  }, [transaction.amount, transaction.type, currencyCode])

  const formattedDate = useMemo(() => {
    const transactionDate = new Date(transaction.occurredAt)
    const currentYear = new Date().getFullYear()
    const transactionYear = transactionDate.getFullYear()

    if (transactionYear === currentYear) {
      return format(transactionDate, 'd MMMM')
    } else {
      return format(transactionDate, 'd MMMM yyyy')
    }
  }, [transaction.occurredAt])

  const duplicateParentDetails = useMemo(() => {
    if (!transaction.duplicateOf) {
      return null
    }

    const occurredAtValue = transaction.duplicateOf.occurredAt
    const occurredAt =
      occurredAtValue instanceof Date
        ? occurredAtValue
        : new Date(occurredAtValue)
    return {
      description: transaction.duplicateOf.description || 'Another transaction',
      occurredAtLabel: format(occurredAt, 'd MMMM yyyy'),
      amountLabel: formatCurrency(
        Number(transaction.duplicateOf.amount),
        currencyCode
      ),
    }
  }, [transaction.duplicateOf, currencyCode])

  // Map transaction data to TransactionFormValues format
  const formDefaultValues: Partial<TransactionFormValues> = {
    fromAccountId: transaction.fromAccountId,
    toAccountId: transaction.toAccountId,
    type: transaction.type,
    categoryId: transaction.categoryId,
    amount: Number(transaction.amount),
    occurredAt: transaction.occurredAt.toISOString().includes('T')
      ? transaction.occurredAt.toISOString().split('T')[0]
      : transaction.occurredAt.toISOString(),
    description: transaction.description || '',
    note: transaction.note || '',
  }

  if (isEditing) {
    return (
      <Card className="p-4">
        <div className="space-y-4">
          <div ref={formRef}>
            <TransactionForm
              formId={`transaction-form-${transaction.id}`}
              defaultValues={formDefaultValues}
              categories={categories}
              accounts={accounts}
              showSubmitButton={false}
              onSubmit={handleFormSubmit}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              form={`transaction-form-${transaction.id}`}
              type="submit"
              disabled={updateTransaction.isPending}
            >
              Done
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  const isUncategorized =
    transaction.type !== 'TRANSFER' && !transaction.categoryId
  const isIncomplete = isTransactionIncomplete(transaction)
  const hasError = isIncomplete || isUncategorized
  const isUnreviewed = transaction.reviewed === false
  const isPossibleDuplicate = transaction.possibleDuplicate === true

  const content = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {hasError && (
            <Badge variant="destructive" className="text-xs shrink-0">
              Incomplete
            </Badge>
          )}
          {isPossibleDuplicate && !hasError && (
            <Badge
              variant="outline"
              className="text-xs shrink-0 border-purple-500/60 text-purple-600 dark:text-purple-200 bg-purple-500/5"
            >
              {duplicateParentDetails
                ? 'Marked duplicate'
                : 'Possible duplicate'}
            </Badge>
          )}
          {isUnreviewed && !hasError && !isPossibleDuplicate && (
            <Badge
              variant="secondary"
              className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700 shrink-0"
            >
              Unreviewed
            </Badge>
          )}
        </div>
        <div>
          <span className="font-medium text-foreground">
            {transaction.description || 'No description'}
          </span>
          {duplicateParentDetails && (
            <p className="text-xs text-muted-foreground mt-1">
              Duplicate of {duplicateParentDetails.description} on{' '}
              {duplicateParentDetails.occurredAtLabel} (
              {duplicateParentDetails.amountLabel})
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{formattedDate}</span>
          <span>•</span>
          {transaction.type === TransactionType.TRANSFER ? (
            <>
              <span
                className={
                  !transaction.fromAccountId
                    ? 'text-destructive font-medium'
                    : ''
                }
              >
                {fromAccountName}
              </span>
              <span>→</span>
              <span
                className={
                  !transaction.toAccountId ? 'text-destructive font-medium' : ''
                }
              >
                {toAccountName}
              </span>
            </>
          ) : transaction.type === TransactionType.EXPENSE ? (
            <>
              <span
                className={
                  !transaction.fromAccountId
                    ? 'text-destructive font-medium'
                    : ''
                }
              >
                {fromAccountName}
              </span>
              <span>→</span>
              <span
                className={
                  isUncategorized ? 'text-destructive font-medium' : ''
                }
              >
                {categoryName}
              </span>
            </>
          ) : (
            <>
              <span
                className={
                  isUncategorized ? 'text-destructive font-medium' : ''
                }
              >
                {categoryName}
              </span>
              <span>→</span>
              <span
                className={
                  !transaction.toAccountId ? 'text-destructive font-medium' : ''
                }
              >
                {toAccountName}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`text-lg font-semibold ${
            transaction.type === TransactionType.EXPENSE
              ? 'text-destructive'
              : transaction.type === 'INCOME'
                ? 'text-success'
                : 'text-foreground'
          }`}
        >
          {formattedAmount}
        </span>
        {showDuplicateActions ? (
          <>
            {onUnlink && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onUnlink}
                    disabled={isUnlinking}
                    title="Unlink duplicate"
                  >
                    <Link2Off className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Unlink this transaction as a duplicate</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDelete}
                  title="Delete transaction"
                  disabled={deleteTransaction.isPending}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete transaction</p>
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            {isUnreviewed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMarkAsReviewed}
                    disabled={markAsReviewed.isPending}
                    title="Mark as reviewed"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mark as reviewed</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  title="Edit transaction"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit transaction</p>
              </TooltipContent>
            </Tooltip>
            {allowDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDelete}
                    title="Delete transaction"
                    disabled={deleteTransaction.isPending}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete transaction</p>
                </TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </div>
  )

  if (noCardWrapper) {
    return (
      <div
        className={cn(
          'p-4 transition-colors',
          hasError ? 'bg-destructive/5 border-destructive/50' : '',
          isUnreviewed && !hasError
            ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
            : ''
        )}
      >
        {content}
      </div>
    )
  }

  return (
    <Card
      className={cn(
        'p-4 transition-colors',
        hasError ? 'bg-destructive/5 border-destructive/50' : '',
        isUnreviewed && !hasError
          ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
          : ''
      )}
    >
      {content}
    </Card>
  )
}
