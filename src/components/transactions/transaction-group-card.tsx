'use client'

import { Transaction } from '@prisma/client'
import { TransactionCard } from './transactions-card'
import { Card } from '@/components/ui/card'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type TransactionWithRelations = Transaction & {
  duplicateOf?: Pick<
    Transaction,
    'id' | 'description' | 'amount' | 'occurredAt'
  > | null
  duplicates?: Array<
    Pick<
      Transaction,
      | 'id'
      | 'description'
      | 'amount'
      | 'occurredAt'
      | 'possibleDuplicate'
      | 'duplicateOfTransactionId'
    >
  >
}

interface TransactionGroupCardProps {
  parentTransaction: TransactionWithRelations
  duplicateTransactions: TransactionWithRelations[]
  allowDelete?: boolean
}

export function TransactionGroupCard({
  parentTransaction,
  duplicateTransactions,
}: TransactionGroupCardProps) {
  const utils = trpc.useUtils()

  const unlinkDuplicate = trpc.transaction.unlinkDuplicate.useMutation({
    onSuccess: () => {
      toast.success('Transaction unlinked from duplicate')
      utils.transaction.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to unlink transaction')
    },
  })

  const handleUnlink = (transactionId: string) => {
    unlinkDuplicate.mutate({ transactionId })
  }

  return (
    <Card className="overflow-hidden border-2 border-purple-200/50 dark:border-purple-800/50">
      <div className="divide-y divide-border">
        {/* Parent transaction */}
        <div className="border-b border-border/50">
          <TransactionCard
            transaction={parentTransaction}
            noCardWrapper={true}
          />
        </div>

        {/* Duplicate transactions */}
        {duplicateTransactions.map((duplicate, index) => (
          <div
            key={duplicate.id}
            className={cn(
              'relative bg-muted/30',
              'border-l-4 border-l-purple-500/60'
            )}
          >
            <div className="mb-2 px-4 pt-4">
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                Duplicate {index + 1} of {duplicateTransactions.length}
              </span>
            </div>
            <TransactionCard
              transaction={duplicate}
              noCardWrapper={true}
              showDuplicateActions={true}
              onUnlink={() => handleUnlink(duplicate.id)}
              isUnlinking={unlinkDuplicate.isPending}
            />
          </div>
        ))}
      </div>
    </Card>
  )
}
