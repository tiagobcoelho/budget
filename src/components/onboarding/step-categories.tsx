'use client'

import { useState, useMemo, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowRight, Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

const PRESET_EXPENSE_CATEGORIES = [
  { id: 'groceries', name: 'Groceries', color: '#10b981' },
  { id: 'transport', name: 'Transport', color: '#3b82f6' },
  { id: 'bills', name: 'Bills & Utilities', color: '#f59e0b' },
  { id: 'entertainment', name: 'Entertainment', color: '#8b5cf6' },
  { id: 'shopping', name: 'Shopping', color: '#ec4899' },
  { id: 'health', name: 'Health & Fitness', color: '#ef4444' },
  { id: 'dining', name: 'Dining Out', color: '#f97316' },
  { id: 'education', name: 'Education', color: '#06b6d4' },
]

const PRESET_INCOME_CATEGORIES = [
  { id: 'salary', name: 'Salary', color: '#10b981' },
  { id: 'freelance', name: 'Freelance', color: '#3b82f6' },
  { id: 'investments', name: 'Investments', color: '#8b5cf6' },
  { id: 'gifts', name: 'Gifts', color: '#ec4899' },
]

const SUGGESTED_CATEGORIES = [
  { name: 'Housing', type: 'EXPENSE' as const },
  { name: 'Food & Dining', type: 'EXPENSE' as const },
  { name: 'Transport', type: 'EXPENSE' as const },
  { name: 'Shopping', type: 'EXPENSE' as const },
  { name: 'Health', type: 'EXPENSE' as const },
  { name: 'Entertainment', type: 'EXPENSE' as const },
  { name: 'Bills', type: 'EXPENSE' as const },
  { name: 'Miscellaneous', type: 'EXPENSE' as const },
  { name: 'Salary', type: 'INCOME' as const },
  { name: 'Freelance', type: 'INCOME' as const },
  { name: 'Investments', type: 'INCOME' as const },
  { name: 'Savings', type: 'INCOME' as const },
]

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Category name is required'),
  type: z.enum(['EXPENSE', 'INCOME']),
})

const categoriesFormSchema = z.object({
  categories: z
    .array(categorySchema)
    .min(1, 'Please select at least one category'),
  customCategoryName: z.string().optional(),
  customCategoryType: z.enum(['EXPENSE', 'INCOME']).optional(),
})

type CategoriesFormValues = z.infer<typeof categoriesFormSchema>

interface StepCategoriesProps {
  onComplete: () => void
}

export function StepCategories({ onComplete }: StepCategoriesProps) {
  const utils = trpc.useUtils()
  const { data: existingCategories } = trpc.category.list.useQuery()
  const updateStep = trpc.user.updateOnboardingStep.useMutation()

  const deleteCategories = trpc.category.deleteBulk.useMutation({
    onSuccess: () => {
      // Invalidate and refetch categories list
      utils.category.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete categories')
    },
  })

  const saveCategories = trpc.category.createBulk.useMutation({
    onSuccess: () => {
      // Invalidate and refetch categories list
      utils.category.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save categories')
    },
  })

  // Merge existing categories and suggested categories into a deduplicated set
  const initialCategories = useMemo(() => {
    const categoriesMap = new Map<
      string,
      {
        id?: string
        name: string
        type: 'EXPENSE' | 'INCOME'
      }
    >()

    // Add existing categories first (with their IDs)
    existingCategories?.forEach((cat) => {
      const key = `${cat.name}-${cat.type}`
      categoriesMap.set(key, { id: cat.id, name: cat.name, type: cat.type })
    })

    // Add suggested categories (they won't overwrite existing ones with same key)
    SUGGESTED_CATEGORIES.forEach((cat) => {
      const key = `${cat.name}-${cat.type}`
      if (!categoriesMap.has(key)) {
        categoriesMap.set(key, { name: cat.name, type: cat.type })
      }
    })

    return Array.from(categoriesMap.values())
  }, [existingCategories])

  // Initialize all categories state with initial categories
  const [allCategories, setAllCategories] =
    useState<CategoriesFormValues['categories']>(initialCategories)

  const form = useForm<CategoriesFormValues>({
    resolver: zodResolver(categoriesFormSchema),
    defaultValues: {
      categories: existingCategories || [],
      customCategoryName: '',
      customCategoryType: 'EXPENSE',
    },
  })

  const selectedCategories = form.watch('categories')
  const customCategoryName = form.watch('customCategoryName')
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false)
  const [errors, setErrors] = useState<string>('')

  // Map preset categories to selected state
  const getPresetCategoryData = (
    presetId: string,
    type: 'EXPENSE' | 'INCOME'
  ) => {
    const presetList =
      type === 'EXPENSE' ? PRESET_EXPENSE_CATEGORIES : PRESET_INCOME_CATEGORIES
    const preset = presetList.find((c) => c.id === presetId)
    if (!preset) return null

    // Check if this category exists in allCategories
    const existing = allCategories.find(
      (cat) => cat.type === type && cat.name === preset.name
    )

    return existing || { name: preset.name, type }
  }

  const handleToggleExpense = (categoryId: string) => {
    const categoryData = getPresetCategoryData(categoryId, 'EXPENSE')
    if (!categoryData) return

    const exists = selectedCategories.some(
      (cat) => cat.type === 'EXPENSE' && cat.name === categoryData.name
    )

    if (exists) {
      form.setValue(
        'categories',
        selectedCategories.filter(
          (cat) => !(cat.type === 'EXPENSE' && cat.name === categoryData.name)
        )
      )
    } else {
      const categoryInAllCategories = allCategories.find(
        (cat) => cat.type === 'EXPENSE' && cat.name === categoryData.name
      )
      form.setValue('categories', [
        ...selectedCategories,
        categoryInAllCategories || categoryData,
      ])
    }
  }

  const handleToggleIncome = (categoryId: string) => {
    const categoryData = getPresetCategoryData(categoryId, 'INCOME')
    if (!categoryData) return

    const exists = selectedCategories.some(
      (cat) => cat.type === 'INCOME' && cat.name === categoryData.name
    )

    if (exists) {
      form.setValue(
        'categories',
        selectedCategories.filter(
          (cat) => !(cat.type === 'INCOME' && cat.name === categoryData.name)
        )
      )
    } else {
      const categoryInAllCategories = allCategories.find(
        (cat) => cat.type === 'INCOME' && cat.name === categoryData.name
      )
      form.setValue('categories', [
        ...selectedCategories,
        categoryInAllCategories || categoryData,
      ])
    }
  }

  const isExpenseSelected = (categoryId: string) => {
    const categoryData = getPresetCategoryData(categoryId, 'EXPENSE')
    if (!categoryData) return false
    return selectedCategories.some(
      (cat) => cat.type === 'EXPENSE' && cat.name === categoryData.name
    )
  }

  const isIncomeSelected = (categoryId: string) => {
    const categoryData = getPresetCategoryData(categoryId, 'INCOME')
    if (!categoryData) return false
    return selectedCategories.some(
      (cat) => cat.type === 'INCOME' && cat.name === categoryData.name
    )
  }

  const addCustomExpense = () => {
    if (!customCategoryName?.trim()) return
    const newCategory = {
      name: customCategoryName.trim(),
      type: 'EXPENSE' as const,
    }

    const exists = selectedCategories.find(
      (cat) =>
        cat.name.toLowerCase() === customCategoryName.trim().toLowerCase() &&
        cat.type === 'EXPENSE'
    )
    if (exists) {
      toast.error('Category already added')
      return
    }

    setAllCategories((prev) => [...prev, newCategory])
    form.setValue('categories', [...selectedCategories, newCategory])
    form.setValue('customCategoryName', '')
    setIsExpenseDialogOpen(false)
  }

  const addCustomIncome = () => {
    if (!customCategoryName?.trim()) return
    const newCategory = {
      name: customCategoryName.trim(),
      type: 'INCOME' as const,
    }

    const exists = selectedCategories.find(
      (cat) =>
        cat.name.toLowerCase() === customCategoryName.trim().toLowerCase() &&
        cat.type === 'INCOME'
    )
    if (exists) {
      toast.error('Category already added')
      return
    }

    setAllCategories((prev) => [...prev, newCategory])
    form.setValue('categories', [...selectedCategories, newCategory])
    form.setValue('customCategoryName', '')
    setIsIncomeDialogOpen(false)
  }

  const customExpenses = selectedCategories.filter(
    (cat) =>
      cat.type === 'EXPENSE' &&
      !PRESET_EXPENSE_CATEGORIES.some((preset) => preset.name === cat.name)
  )

  const customIncome = selectedCategories.filter(
    (cat) =>
      cat.type === 'INCOME' &&
      !PRESET_INCOME_CATEGORIES.some((preset) => preset.name === cat.name)
  )

  const handleSubmit = () => {
    // Validate that at least one category is selected
    const expenseCategories = selectedCategories.filter(
      (cat) => cat.type === 'EXPENSE'
    )
    const incomeCategories = selectedCategories.filter(
      (cat) => cat.type === 'INCOME'
    )

    if (expenseCategories.length === 0) {
      setErrors('Please select at least one expense category')
      return
    }
    if (incomeCategories.length === 0) {
      setErrors('Please select at least one income category')
      return
    }
    setErrors('')

    // Create a set of selected category keys for comparison
    const selectedCategoryKeys = new Set(
      selectedCategories.map((cat) => `${cat.name}-${cat.type}`)
    )

    // Find categories to delete (exist in backend but not in selectedCategories)
    const categoriesToDelete =
      existingCategories?.filter(
        (cat) => !selectedCategoryKeys.has(`${cat.name}-${cat.type}`)
      ) || []

    // Find categories to create (in selectedCategories but no ID)
    const newCategories = selectedCategories.filter((cat) => !cat.id)

    // If nothing changed, just advance step
    if (categoriesToDelete.length === 0 && newCategories.length === 0) {
      updateStep.mutate(
        { step: 5 },
        {
          onSuccess: () => {
            onComplete()
          },
          onError: (error) => {
            toast.error(error.message || 'Failed to update step')
          },
        }
      )
      return
    }

    // Helper function to handle step update and completion
    const handleComplete = () => {
      updateStep.mutate(
        { step: 5 },
        {
          onSuccess: () => {
            toast.success('Categories updated')
            onComplete()
          },
          onError: (error) => {
            toast.error(error.message || 'Failed to update step')
          },
        }
      )
    }

    // Delete categories that were deselected
    if (categoriesToDelete.length > 0) {
      const categoryIdsToDelete = categoriesToDelete.map((cat) => cat.id)
      deleteCategories.mutate(categoryIdsToDelete)
    }

    if (newCategories.length > 0) {
      // Only new categories to create
      saveCategories.mutate(
        newCategories.map((category) => ({
          name: category.name,
          type: category.type,
        }))
      )
    }

    handleComplete()
  }

  // Update allCategories when initialCategories changes (when existingCategories loads)
  useEffect(() => {
    setAllCategories(initialCategories)
    // Only update form if it hasn't been initialized yet (categories array is empty)
    if (existingCategories?.length !== selectedCategories.length) {
      form.setValue(
        'categories',
        existingCategories?.map((category) => ({
          id: category.id,
          name: category.name,
          type: category.type,
        })) || []
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingCategories])

  return (
    <Form {...form}>
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Organize your categories
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose categories to organize your spending and income
          </p>
        </div>

        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PRESET_EXPENSE_CATEGORIES.map((category) => {
                const isSelected = isExpenseSelected(category.id)
                return (
                  <Card
                    key={category.id}
                    className={`cursor-pointer border-2 p-4 transition-all hover:border-primary/50 ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                    onClick={() => handleToggleExpense(category.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleExpense(category.id)}
                      />
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-foreground">
                        {category.name}
                      </span>
                    </div>
                  </Card>
                )
              })}
            </div>

            {customExpenses.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  Custom Expense Categories
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {customExpenses.map((category, index) => (
                    <Card
                      key={index}
                      className="border-2 border-accent/50 bg-accent/5 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: '#6366f1' }}
                        />
                        <span className="font-medium text-foreground">
                          {category.name}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Dialog
              open={isExpenseDialogOpen}
              onOpenChange={setIsExpenseDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Plus className="h-4 w-4" />
                  Add Custom Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Custom Expense Category</DialogTitle>
                  <DialogDescription>
                    Create a custom category for your expenses
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <FormLabel htmlFor="expenseName">Category Name</FormLabel>
                    <FormField
                      control={form.control}
                      name="customCategoryName"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              id="expenseName"
                              placeholder="e.g., Pet Care, Subscriptions"
                              {...field}
                              disabled={
                                saveCategories.isPending ||
                                deleteCategories.isPending
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addCustomExpense()
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    onClick={addCustomExpense}
                    className="w-full"
                    disabled={
                      saveCategories.isPending || deleteCategories.isPending
                    }
                  >
                    Add Category
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="income" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PRESET_INCOME_CATEGORIES.map((category) => {
                const isSelected = isIncomeSelected(category.id)
                return (
                  <Card
                    key={category.id}
                    className={`cursor-pointer border-2 p-4 transition-all hover:border-primary/50 ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                    onClick={() => handleToggleIncome(category.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleIncome(category.id)}
                      />
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-foreground">
                        {category.name}
                      </span>
                    </div>
                  </Card>
                )
              })}
            </div>

            {customIncome.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  Custom Income Categories
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {customIncome.map((category, index) => (
                    <Card
                      key={index}
                      className="border-2 border-accent/50 bg-accent/5 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: '#10b981' }}
                        />
                        <span className="font-medium text-foreground">
                          {category.name}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Dialog
              open={isIncomeDialogOpen}
              onOpenChange={setIsIncomeDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Plus className="h-4 w-4" />
                  Add Custom Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Custom Income Category</DialogTitle>
                  <DialogDescription>
                    Create a custom category for your income
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <FormLabel htmlFor="incomeName">Category Name</FormLabel>
                    <FormField
                      control={form.control}
                      name="customCategoryName"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              id="incomeName"
                              placeholder="e.g., Rental Income, Side Hustle"
                              {...field}
                              disabled={
                                saveCategories.isPending ||
                                deleteCategories.isPending
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addCustomIncome()
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    onClick={addCustomIncome}
                    className="w-full"
                    disabled={
                      saveCategories.isPending || deleteCategories.isPending
                    }
                  >
                    Add Category
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>

        {errors && <p className="text-sm text-destructive">{errors}</p>}

        <div className="flex items-center justify-between pt-4">
          {/* Back button handled by parent layout */}
          <Button
            onClick={handleSubmit}
            size="lg"
            className="ml-auto gap-2"
            disabled={saveCategories.isPending || deleteCategories.isPending}
          >
            {saveCategories.isPending || deleteCategories.isPending
              ? 'Saving...'
              : 'Continue'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Form>
  )
}
