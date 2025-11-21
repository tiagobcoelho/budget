'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Plus } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/format'
import { Transaction } from '@/server/trpc/schemas/transaction.schema'

interface NoBudgetCategoryCardProps {
  categoryName: string
  transactions: Transaction[]
}

export function NoBudgetCategoryCard({
  categoryName,
  transactions,
}: NoBudgetCategoryCardProps) {
  const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0)

  return (
    <Card className="border-orange-500/30 bg-orange-500/5">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-orange-500" />
            <h4 className="font-semibold">{categoryName}</h4>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-orange-500">
              €{totalSpent.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">No budget set</p>
          </div>
        </div>

        <div className="mb-3 space-y-1.5">
          {transactions.slice(0, 3).map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex-1 truncate">
                <p className="truncate font-medium">
                  {transaction.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(transaction.occurredAt)}
                </p>
              </div>
              <p className="ml-2 font-semibold">
                €{transaction.amount.toFixed(2)}
              </p>
            </div>
          ))}
          {transactions.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{transactions.length - 3} more transactions
            </p>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5 border-orange-500/30 hover:bg-orange-500/10"
          asChild
        >
          <Link href={`/budgets?category=${categoryName}`}>
            <Plus className="size-3.5" />
            Create Budget for {categoryName}
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
