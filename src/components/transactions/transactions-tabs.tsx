'use client'

import { useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TransactionForm,
  type TransactionFormValues,
} from '@/components/transactions/transaction-form'
import { PdfUploader } from '@/components/transactions/transactions-uploader'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { Transaction } from '@prisma/client'

export const TransactionsTabs = () => {
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

  const handleTransactionsExtracted = useCallback(
    (transactions: Transaction[]) => {
      if (transactions.length === 0) {
        toast.error('No transactions were detected in that file')
        return
      }

      toast.success(
        `Created ${transactions.length} transaction${
          transactions.length !== 1 ? 's' : ''
        } from PDF.`
      )
      utils.transaction.list.invalidate()
    },
    [utils]
  )

  const onCreateManualTransaction = (data: TransactionFormValues) => {
    createTransaction.mutate({
      ...data,
      occurredAt: new Date(data.occurredAt).toISOString(),
    })
  }

  return (
    <Tabs defaultValue="upload" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="upload">Upload Files</TabsTrigger>
        <TabsTrigger value="manual">Manual Entry</TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="space-y-6 pt-6">
        <PdfUploader onTransactionsExtracted={handleTransactionsExtracted} />
      </TabsContent>

      <TabsContent value="manual" className="space-y-6 pt-6">
        <Card>
          <CardHeader>
            <CardTitle>Add transaction manually</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionForm
              formId="inline-add-transaction-form"
              categories={categories}
              accounts={accounts}
              showSubmitButton={true}
              submitLabel={
                createTransaction.isPending ? 'Adding...' : 'Add transaction'
              }
              isSubmitting={createTransaction.isPending}
              onSubmit={onCreateManualTransaction}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
