'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
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
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc/client'
import { BudgetSuggestion } from '@/server/trpc/schemas/report.schema'

const budgetSuggestionFormSchema = z.object({
  name: z.string().min(1, 'Budget name is required'),
  categoryId: z.string().uuid('Category is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  amount: z.number().positive('Amount must be greater than 0'),
})

export type BudgetSuggestionFormValues = z.infer<
  typeof budgetSuggestionFormSchema
>

interface BudgetSuggestionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  suggestion: BudgetSuggestion
  mode?: 'suggestion' | 'initial'
  onSubmit: (editedData: BudgetSuggestionFormValues) => Promise<void>
}

export function BudgetSuggestionDialog({
  open,
  onOpenChange,
  suggestion,
  mode = 'suggestion',
  onSubmit,
}: BudgetSuggestionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { data: categories } = trpc.category.list.useQuery()
  const isInitialMode = mode === 'initial'

  // Filter expense categories only
  const expenseCategories = (categories || []).filter(
    (cat) => cat.type === 'EXPENSE'
  )

  const form = useForm<BudgetSuggestionFormValues>({
    resolver: zodResolver(budgetSuggestionFormSchema),
    defaultValues: {
      name: suggestion.suggestion?.name || suggestion.currentBudget?.name || '',
      categoryId:
        suggestion.suggestion?.categoryId ||
        suggestion.currentBudget?.categoryId ||
        '',
      startDate: suggestion.suggestion?.startDate || '',
      endDate: suggestion.suggestion?.endDate || '',
      amount:
        suggestion.suggestion?.amount ||
        suggestion.suggestedChanges?.amount ||
        0,
    },
  })

  useEffect(() => {
    if (suggestion.suggestion) {
      form.reset({
        name: suggestion.suggestion.name,
        categoryId: suggestion.suggestion.categoryId,
        startDate: suggestion.suggestion.startDate,
        endDate: suggestion.suggestion.endDate,
        amount: suggestion.suggestion.amount,
      })
    } else if (suggestion.currentBudget && suggestion.suggestedChanges) {
      form.reset({
        name: suggestion.currentBudget.name,
        categoryId:
          suggestion.suggestedChanges.categoryId ||
          suggestion.currentBudget.categoryId,
        startDate: '',
        endDate: '',
        amount:
          suggestion.suggestedChanges.amount || suggestion.currentBudget.amount,
      })
    }
  }, [suggestion, form])

  useEffect(() => {
    const startDate = form.getValues('startDate')
    if (!startDate) return

    const start = new Date(startDate)
    const end = new Date(start)
    end.setMonth(end.getMonth() + 1)

    form.setValue('endDate', end.toISOString().split('T')[0])
  }, [form])

  const handleSubmit = async (data: BudgetSuggestionFormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isInitialMode ? 'Edit Budget' : 'Edit Budget Suggestion'}
          </DialogTitle>
          <DialogDescription>
            {isInitialMode
              ? 'Update the budget details. Changes apply immediately.'
              : 'Review and modify the budget suggestion before approving.'}
            {!isInitialMode &&
              suggestion.type === 'CREATE' &&
              suggestion.suggestion && (
                <span className="mt-1 block text-xs italic">
                  Note: This will create a recurring monthly budget that
                  automatically rolls over each month.
                </span>
              )}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the category for this budget
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly Food Budget" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={false} />
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
                  <FormLabel>Total Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isInitialMode
                    ? 'Saving...'
                    : 'Approving...'
                  : isInitialMode
                    ? 'Save Changes'
                    : 'Approve'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
