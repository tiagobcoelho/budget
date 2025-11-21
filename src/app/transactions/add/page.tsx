'use client'

import { useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TransactionForm,
  type TransactionFormValues,
} from '@/components/transactions/transaction-form'
import { trpc } from '@/lib/trpc/client'
import { TransactionList } from '@/components/transactions/transactions-list'
import { PdfUploader } from '@/components/transactions/transactions-uploader'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Transaction } from '@prisma/client'

export default function AddTransactionPage() {
  const router = useRouter()
  const utils = trpc.useUtils()
  const { data: categories = [] } = trpc.category.list.useQuery()
  const { data: accounts = [] } = trpc.account.list.useQuery()

  const createTransaction = trpc.transaction.create.useMutation({
    onSuccess: () => {
      toast.success('Transaction added successfully')
      utils.transaction.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add transaction')
    },
  })

  const onSubmit = (data: TransactionFormValues) => {
    createTransaction.mutate({
      ...data,
      occurredAt: new Date(data.occurredAt).toISOString(),
    })
  }

  const [createdTransactionIds, setCreatedTransactionIds] = useState<string[]>(
    []
  )

  const handleTransactionsExtracted = useCallback(
    (transactions: Transaction[]) => {
      // Extract transaction IDs from transactions (they include id field from API)
      // The API returns transactions with id field in the response
      const transactionIds = transactions.map((t) => t.id)

      if (transactionIds.length > 0) {
        setCreatedTransactionIds(transactionIds)
        // Invalidate and refetch to ensure new transactions are available
        utils.transaction.list.invalidate()
      } else {
        console.warn(
          'No transaction IDs found in extracted transactions:',
          transactions
        )
      }
    },
    [utils]
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Add Transactions
            </h1>
            <p className="text-muted-foreground">
              Manually add transactions or upload a bank statement PDF
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/transactions')}
          >
            Back to Transactions
          </Button>
        </div>
        {/* PDF Upload Section */}
        <PdfUploader onTransactionsExtracted={handleTransactionsExtracted} />
        {/* Extracted Transactions List */}
        {createdTransactionIds.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Extracted Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionList
                transactionIds={createdTransactionIds}
                allowDelete
              />
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => {
                    setCreatedTransactionIds([])
                  }}
                >
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Manual Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add Transaction Manually</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionForm
              formId="add-transaction-form"
              categories={categories}
              accounts={accounts}
              showSubmitButton={true}
              submitLabel={
                createTransaction.isPending ? 'Adding...' : 'Add Transaction'
              }
              isSubmitting={createTransaction.isPending}
              onSubmit={onSubmit}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
