'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { toast } from 'sonner'
import {
  CreateCategoryInput,
  createCategorySchema,
} from '@/server/trpc/schemas/category.schema'

interface CreateCategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType?: 'EXPENSE' | 'INCOME'
  onSuccess?: (category: {
    id: string
    name: string
    type: 'EXPENSE' | 'INCOME'
  }) => void
}

export function CreateCategoryModal({
  open,
  onOpenChange,
  defaultType = 'EXPENSE',
  onSuccess,
}: CreateCategoryModalProps) {
  const utils = trpc.useUtils()

  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: '',
      type: defaultType,
    },
  })

  const createCategory = trpc.category.create.useMutation({
    onSuccess: (newCategory) => {
      toast.success('Category added successfully')
      utils.category.list.invalidate().then(() => {
        // Call the onSuccess callback if provided
        setTimeout(() => {
          onSuccess?.(newCategory)
        }, 100)
      })

      setIsOpen(false)
      form.reset()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add category')
    },
  })

  const handleSubmit = (data: CreateCategoryInput) => {
    createCategory.mutate(data)
  }

  const setIsOpen = (value: boolean) => {
    onOpenChange(value)
    if (!value) {
      form.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
          <DialogDescription>
            Create a new category. The transaction will be automatically updated
            with this category.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Groceries, Salary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                      <SelectItem value="INCOME">Income</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCategory.isPending}>
                {createCategory.isPending ? 'Adding...' : 'Add Category'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
