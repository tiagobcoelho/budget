'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
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
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { normalizePeriodStart } from '@/lib/budget/period'

const budgetFormSchema = z
  .object({
    categoryId: z.string().uuid('Category is required'),
    name: z.string().min(1).optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    amount: z.number().positive('Amount must be greater than 0'),
  })
  .refine(
    (data) => {
      return new Date(data.startDate) < new Date(data.endDate)
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  )

type BudgetFormValues = z.infer<typeof budgetFormSchema>

interface CreateBudgetFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateBudgetForm({
  open,
  onOpenChange,
}: CreateBudgetFormProps) {
  const utils = trpc.useUtils()
  const { data: categories } = trpc.category.list.useQuery()
  const { data: preferences } = trpc.preference.get.useQuery()

  const createBudget = trpc.budget.create.useMutation({
    onSuccess: () => {
      toast.success('Budget created successfully')
      utils.budget.list.invalidate()
      utils.budget.definitions.invalidate()
      form.reset({
        categoryId: '',
        name: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        amount: 0,
      })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create budget')
    },
  })

  // Filter expense categories only
  const expenseCategories = (categories || []).filter(
    (cat) => cat.type === 'EXPENSE'
  )

  // Get budgetStartDay from preferences
  const budgetStartDay =
    (preferences?.budgetStartDay as number | undefined) ?? 1

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      categoryId: '',
      name: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      amount: 0,
    },
  })

  const categoryId = form.watch('categoryId')
  const startDate = form.watch('startDate')

  // Auto-calculate end date for MONTHLY budgets based on budgetStartDay
  useEffect(() => {
    if (!startDate) return

    // Calculate monthly period bounds using budgetStartDay
    const start = new Date(startDate)
    const year = start.getFullYear()
    const month = start.getMonth()
    const day = start.getDate()

    // Find the period start date
    let periodStart: Date
    if (day < budgetStartDay) {
      // Before start day, use previous month
      const prevMonth = month === 0 ? 11 : month - 1
      const prevYear = month === 0 ? year - 1 : year
      const lastDayOfPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate()
      const startDay = Math.min(budgetStartDay, lastDayOfPrevMonth)
      periodStart = new Date(prevYear, prevMonth, startDay)
    } else {
      // On or after start day, use current month
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
      const startDay = Math.min(budgetStartDay, lastDayOfMonth)
      periodStart = new Date(year, month, startDay)
    }

    // Calculate end date (day before next period start)
    const nextPeriodStart = normalizePeriodStart(
      new Date(
        periodStart.getFullYear(),
        periodStart.getMonth() + 1,
        periodStart.getDate()
      ),
      budgetStartDay
    )
    const end = new Date(nextPeriodStart)
    end.setDate(end.getDate() - 1)

    form.setValue('startDate', periodStart.toISOString().split('T')[0])
    form.setValue('endDate', end.toISOString().split('T')[0])
  }, [startDate, budgetStartDay, form])

  // Auto-generate name when category is set
  useEffect(() => {
    if (categoryId && !form.getValues('name')) {
      const category = expenseCategories.find((cat) => cat.id === categoryId)
      if (category) {
        const startDate = new Date(form.getValues('startDate'))
        let name = ''

        // All budgets are MONTHLY
        name = `${category.name} - ${startDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })}`
        form.setValue('name', name)
      }
    }
  }, [categoryId, expenseCategories, form])

  const onSubmit = (data: BudgetFormValues) => {
    // All budgets are MONTHLY
    createBudget.mutate({
      categoryId: data.categoryId,
      name: data.name,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
      amount: data.amount,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Budget</DialogTitle>
          <DialogDescription>
            Set up a new budget to track your spending.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <Input
                      placeholder="Auto-generated from category and period"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Budget name (auto-generated if left empty)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm font-medium">Budget Period</p>
              <p className="text-sm text-muted-foreground mt-1">
                Monthly budget starting on day {budgetStartDay} of each month
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Change your budget start day in Settings
              </p>
            </div>

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    When does this budget period start?
                  </FormDescription>
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
                    <Input type="date" {...field} disabled={true} />
                  </FormControl>
                  <FormDescription>
                    End date is automatically calculated based on your budget
                    start day
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Total budget amount for this period
                  </FormDescription>
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
              <Button type="submit" disabled={createBudget.isPending}>
                {createBudget.isPending ? 'Creating...' : 'Create Budget'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
