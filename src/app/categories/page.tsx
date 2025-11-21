'use client'
import { useState, useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { AddCategoryForm } from '@/components/forms/add-category-form'
import { CategoryDot } from '@/components/budget-card/category-dot'
import { formatCurrency } from '@/lib/format'

export default function CategoriesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const { data: categories = [] } = trpc.category.listWithMetrics.useQuery()
  const { data: preferences } = trpc.preference.get.useQuery()
  const currencyCode =
    (preferences?.defaultCurrencyCode as string | undefined) ?? 'USD'

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')
  const incomeCategories = categories.filter((c) => c.type === 'INCOME')

  // Calculate total expenses for percentage calculation
  const totalExpenses = useMemo(() => {
    return expenseCategories.reduce(
      (sum, category) => sum + Number(category.totalAmount ?? 0),
      0
    )
  }, [expenseCategories])

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Categories
            </h1>
            <p className="text-sm text-muted-foreground">
              Organize your spending
            </p>
          </div>
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="mr-2 size-4" />
            Add Category
          </Button>
        </div>
        <AddCategoryForm open={isFormOpen} onOpenChange={setIsFormOpen} />

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenseCategories.map((category) => {
                const transactionCount = category.transactionCount ?? 0
                const totalAmount = Number(category.totalAmount ?? 0)
                const avgMonthly = Number(category.avgMonthlyAmount ?? 0)
                const percentOfTotal =
                  totalExpenses > 0 ? (totalAmount / totalExpenses) * 100 : 0

                return (
                  <div
                    key={category.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryDot
                        category={category.name}
                        color={category.color}
                      />
                      <div>
                        <p className="text-sm font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {transactionCount} transaction
                          {transactionCount !== 1 ? 's' : ''}
                          {percentOfTotal > 0 &&
                            ` • ${percentOfTotal.toFixed(0)}% of total`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(totalAmount, currencyCode)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        avg {formatCurrency(avgMonthly, currencyCode)}/mo
                      </p>
                    </div>
                  </div>
                )
              })}
              {expenseCategories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No expense categories yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Income Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Income Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incomeCategories.map((category) => {
                const transactionCount = category.transactionCount ?? 0
                const totalAmount = Number(category.totalAmount ?? 0)
                const avgMonthly = Number(category.avgMonthlyAmount ?? 0)

                return (
                  <div
                    key={category.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryDot
                        category={category.name}
                        color={category.color}
                      />
                      <div>
                        <p className="text-sm font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {transactionCount} transaction
                          {transactionCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-success">
                        +{formatCurrency(totalAmount, currencyCode)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        avg {formatCurrency(avgMonthly, currencyCode)}/mo
                      </p>
                    </div>
                  </div>
                )
              })}
              {incomeCategories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No income categories yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
