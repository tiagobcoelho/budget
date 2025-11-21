'use client'

import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CreateCategoryModal } from '@/components/categories/create-category-modal'
import { createTransactionSchema } from '@/server/trpc/schemas/transaction.schema'

// Extend the server-side schema with UI-specific validations
// This keeps the schemas connected - changes to the server schema will flow to the UI
export const transactionFormSchema = createTransactionSchema
  .extend({
    // Override amount to add positive validation with custom error message
    amount: z.number().positive('Amount must be greater than 0'),
    // Override occurredAt to ensure it's a string (for date input) with validation
    // The server schema accepts both string and date, but the form always uses strings
    occurredAt: z.string().min(1, 'Date is required'),
  })
  .refine(
    (data) => {
      if (data.type === 'EXPENSE') {
        return !!data.fromAccountId
      }
      if (data.type === 'INCOME') {
        return !!data.toAccountId
      }
      if (data.type === 'TRANSFER') {
        return (
          !!data.fromAccountId &&
          !!data.toAccountId &&
          data.fromAccountId !== data.toAccountId
        )
      }
      return true
    },
    {
      message: 'Account selection is invalid for this transaction type',
    }
  )

export type TransactionFormValues = z.infer<typeof transactionFormSchema>

interface TransactionFormProps {
  formId: string
  // Controlled mode props
  defaultValues?: Partial<TransactionFormValues>
  // Uncontrolled mode props
  // Common props
  categories: Array<{ id: string; name: string; type: 'EXPENSE' | 'INCOME' }>
  accounts: Array<{ id: string; name: string; type: string }>
  showSubmitButton?: boolean
  submitLabel?: string
  isSubmitting?: boolean
  onSubmit?: (data: TransactionFormValues) => void
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  formId,
  defaultValues,
  categories,
  accounts,
  showSubmitButton = false,
  submitLabel = 'Submit',
  isSubmitting = false,
  onSubmit,
}) => {
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)

  console.log('categories', categories)

  // Create internal form if not provided (controlled mode)
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      ...defaultValues,
    },
    mode: 'onChange',
  })

  const handleOpenAddCategory = () => {
    setIsAddCategoryOpen(true)
  }

  const handleCategoryCreated = (newCategory: {
    id: string
    name: string
    type: 'EXPENSE' | 'INCOME'
  }) => {
    // Automatically set the transaction with the new category
    const currentTransactionType = form.getValues('type')
    if (currentTransactionType !== 'TRANSFER') {
      // Set the new category
      console.log('setting categoryId', newCategory.id)
      form.setValue('categoryId', newCategory.id)

      // If transaction type doesn't match category type, update transaction type
      if (currentTransactionType !== newCategory.type) {
        form.setValue('type', newCategory.type)
        // Clear the opposite account
        if (newCategory.type === 'EXPENSE') {
          form.setValue('toAccountId', null)
        } else {
          form.setValue('fromAccountId', null)
        }
      }
    }
  }

  const transactionType = form.watch('type')

  const filteredCategories = categories.filter(
    (cat: { id: string; name: string; type: 'EXPENSE' | 'INCOME' }) =>
      cat.type === transactionType
  )

  const handleSubmit = (data: TransactionFormValues) => {
    console.log('handleSubmit from form', data)
    onSubmit?.(data)
    form.reset()
  }

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
      >
        {/* First row: Date, Description, Amount */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="occurredAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={
                      field.value
                        ? field.value.split('T')[0]
                        : new Date().toISOString().split('T')[0]
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Brief description (optional)"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      field.onChange(val)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Second row: Type, then conditional fields */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select
                  onValueChange={(value: 'EXPENSE' | 'INCOME' | 'TRANSFER') => {
                    field.onChange(value)
                    // Reset category and accounts when type changes
                    form.setValue('categoryId', null)
                    if (value === 'EXPENSE') {
                      form.setValue('toAccountId', null)
                    } else if (value === 'INCOME') {
                      form.setValue('fromAccountId', null)
                    } else if (value === 'TRANSFER') {
                      form.setValue('categoryId', null)
                    }
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select transaction type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* For EXPENSE: From Account and Category */}
          {transactionType === 'EXPENSE' && (
            <>
              <FormField
                control={form.control}
                name="fromAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Account</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? null : value)
                      }
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">
                          Select an account
                        </SelectItem>
                        {accounts.map(
                          (account: {
                            id: string
                            name: string
                            type: string
                          }) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        if (value === '__add_category__') {
                          handleOpenAddCategory()
                        } else {
                          field.onChange(value === '__none__' ? null : value)
                        }
                      }}
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {filteredCategories.map(
                          (category: {
                            id: string
                            name: string
                            type: 'EXPENSE' | 'INCOME'
                          }) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          )
                        )}
                        <SelectSeparator />
                        <SelectItem value="__add_category__">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Category
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* For INCOME: To Account and Category */}
          {transactionType === 'INCOME' && (
            <>
              <FormField
                control={form.control}
                name="toAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Account</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? null : value)
                      }
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">
                          Select an account
                        </SelectItem>
                        {accounts.map(
                          (account: {
                            id: string
                            name: string
                            type: string
                          }) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        if (value === '__add_category__') {
                          handleOpenAddCategory()
                        } else {
                          field.onChange(value === '__none__' ? null : value)
                        }
                      }}
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {filteredCategories.map(
                          (category: {
                            id: string
                            name: string
                            type: 'EXPENSE' | 'INCOME'
                          }) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          )
                        )}
                        <SelectSeparator />
                        <SelectItem value="__add_category__">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Category
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* For TRANSFER: From Account and To Account */}
          {transactionType === 'TRANSFER' && (
            <>
              <FormField
                control={form.control}
                name="fromAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Account</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? null : value)
                      }
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">
                          Select source account
                        </SelectItem>
                        {accounts
                          .filter(
                            (account: {
                              id: string
                              name: string
                              type: string
                            }) => account.id !== form.watch('toAccountId')
                          )
                          .map(
                            (account: {
                              id: string
                              name: string
                              type: string
                            }) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name}
                              </SelectItem>
                            )
                          )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="toAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Account</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? null : value)
                      }
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">
                          Select destination account
                        </SelectItem>
                        {accounts
                          .filter(
                            (account: {
                              id: string
                              name: string
                              type: string
                            }) => account.id !== form.watch('fromAccountId')
                          )
                          .map(
                            (account: {
                              id: string
                              name: string
                              type: string
                            }) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name}
                              </SelectItem>
                            )
                          )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>

        {showSubmitButton && (
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : submitLabel}
            </Button>
          </div>
        )}
      </form>

      {/* Add Category Modal */}
      <CreateCategoryModal
        open={isAddCategoryOpen}
        onOpenChange={setIsAddCategoryOpen}
        defaultType={
          transactionType === 'TRANSFER'
            ? 'EXPENSE'
            : (transactionType as 'EXPENSE' | 'INCOME')
        }
        onSuccess={handleCategoryCreated}
      />
    </Form>
  )
}
