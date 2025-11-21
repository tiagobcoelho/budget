'use client'
import { useState, useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CreateBudgetForm } from '@/components/forms/create-budget-form'
import { EditableBudgetCard } from '@/components/editable-budget-card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import { getCategoryColor } from '@/lib/category-colors'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/format'
import { trpc } from '@/lib/trpc/client'
// Helper to safely get spent amount from budget
function getSpent(budget: { spent?: number }): number {
  return Number(budget.spent || 0)
}

// Helper to safely get amount from budget (handles Decimal type)
function getAmount(budget: {
  amount: number | { toString: () => string }
}): number {
  if (typeof budget.amount === 'number') {
    return budget.amount
  }
  return Number(budget.amount.toString())
}

function toNumber(
  value: number | { toString: () => string } | undefined
): number {
  if (value === undefined) return 0
  return typeof value === 'number' ? value : Number(value.toString())
}

const RADIAN = Math.PI / 180

const renderDefinitionLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  name,
  payload,
}: PieLabelRenderProps & {
  payload?: { percentage?: string }
}) => {
  if (
    cx === undefined ||
    cy === undefined ||
    midAngle === undefined ||
    innerRadius === undefined ||
    outerRadius === undefined
  ) {
    return null
  }

  const inner =
    typeof innerRadius === 'number' ? innerRadius : Number(innerRadius)
  const outer =
    typeof outerRadius === 'number' ? outerRadius : Number(outerRadius)
  const angle = typeof midAngle === 'number' ? midAngle : Number(midAngle)
  const centerX = typeof cx === 'number' ? cx : Number(cx)
  const centerY = typeof cy === 'number' ? cy : Number(cy)

  if (
    Number.isNaN(inner) ||
    Number.isNaN(outer) ||
    Number.isNaN(angle) ||
    Number.isNaN(centerX) ||
    Number.isNaN(centerY)
  ) {
    return null
  }

  const radius = inner + (outer - inner) * 0.5
  const x = centerX + radius * Math.cos(-angle * RADIAN)
  const y = centerY + radius * Math.sin(-angle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > centerX ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-semibold"
    >
      <tspan x={x} dy="-0.5em">
        {name}
      </tspan>
      <tspan x={x} dy="1.2em">
        {payload?.percentage ?? '0'}%
      </tspan>
    </text>
  )
}

export default function BudgetsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const utils = trpc.useUtils()
  const { data: budgets, isLoading } = trpc.budget.list.useQuery()
  const { data: definitions, isLoading: definitionsLoading } =
    trpc.budget.definitions.useQuery({ includeArchived: true })
  const { data: preferences } = trpc.preference.get.useQuery()
  const currencyCode =
    (preferences?.defaultCurrencyCode as string | undefined) ?? 'USD'

  const updateDefinition = trpc.budget.updateDefinition.useMutation({
    onSuccess: async () => {
      toast.success('Budget updated')
      await Promise.all([
        utils.budget.definitions.invalidate(),
        utils.budget.list.invalidate(),
      ])
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update budget definition')
    },
  })

  const archiveDefinition = trpc.budget.archiveDefinition.useMutation({
    onSuccess: async () => {
      toast.success('Budget archived')
      await Promise.all([
        utils.budget.definitions.invalidate(),
        utils.budget.list.invalidate(),
      ])
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to archive budget')
    },
  })

  const reactivateDefinition = trpc.budget.reactivateDefinition.useMutation({
    onSuccess: async () => {
      toast.success('Budget reactivated')
      await Promise.all([
        utils.budget.definitions.invalidate(),
        utils.budget.list.invalidate(),
      ])
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reactivate budget')
    },
  })

  const handleSaveDefinition = async (definitionId: string, amount: number) => {
    await updateDefinition.mutateAsync({ id: definitionId, amount })
  }

  const handleArchiveDefinition = async (definitionId: string) => {
    await archiveDefinition.mutateAsync({ id: definitionId })
  }

  const handleReactivateDefinition = async (definitionId: string) => {
    await reactivateDefinition.mutateAsync({ id: definitionId })
  }

  // Group budgets by category
  const budgetsByCategory = useMemo(() => {
    if (!budgets) return new Map<string, NonNullable<typeof budgets>>()

    const grouped = new Map<string, NonNullable<typeof budgets>>()

    budgets.forEach((budget) => {
      const categoryId = budget.categoryId
      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, [])
      }
      grouped.get(categoryId)!.push(budget)
    })

    return grouped
  }, [budgets])

  const activeDefinitions = useMemo(
    () => (definitions || []).filter((definition) => definition.isActive),
    [definitions]
  )

  const sortedDefinitions = useMemo(() => {
    return [...activeDefinitions].sort(
      (a, b) => toNumber(b.amount) - toNumber(a.amount)
    )
  }, [activeDefinitions])

  const archivedDefinitions = useMemo(
    () => (definitions || []).filter((definition) => !definition.isActive),
    [definitions]
  )

  const totalDefinitionBudget = useMemo(
    () =>
      activeDefinitions.reduce(
        (sum, definition) => sum + toNumber(definition.amount),
        0
      ),
    [activeDefinitions]
  )

  const definitionChartData = useMemo(
    () =>
      sortedDefinitions.map((definition) => {
        const amount = toNumber(definition.amount)
        const name = definition.category?.name ?? definition.name
        return {
          id: definition.id,
          name,
          value: amount,
          percentage:
            totalDefinitionBudget > 0
              ? ((amount / totalDefinitionBudget) * 100).toFixed(1)
              : '0.0',
          color: getCategoryColor(name, definition.category?.color),
        }
      }),
    [sortedDefinitions, totalDefinitionBudget]
  )

  // Calculate aggregate totals for all budgets
  const { totalAllocated, totalSpent, overallProgress } = useMemo(() => {
    if (!budgets)
      return { totalAllocated: 0, totalSpent: 0, overallProgress: 0 }

    let allocated = 0
    let spent = 0

    budgets.forEach((budget) => {
      allocated += getAmount(budget)
      spent += getSpent(budget)
    })

    const progress = allocated > 0 ? (spent / allocated) * 100 : 0
    return {
      totalAllocated: allocated,
      totalSpent: spent,
      overallProgress: progress,
    }
  }, [budgets])

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Budget Management
            </h1>
            <p className="text-muted-foreground">
              Set and manage your monthly spending limits
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add Category
          </Button>
        </div>
        <CreateBudgetForm open={isFormOpen} onOpenChange={setIsFormOpen} />

        <Card>
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Overall Monthly Budget
                </h3>
                <div>
                  <p className="text-sm text-muted-foreground">Total Budget</p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(totalDefinitionBudget, currencyCode)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sum of all category budgets
                  </p>
                </div>
              </div>

              <div className="h-[350px] w-full lg:w-[450px]">
                {definitionChartData.length > 0 && totalDefinitionBudget > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={definitionChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderDefinitionLabel}
                        innerRadius="50%"
                        outerRadius="80%"
                        dataKey="value"
                      >
                        {definitionChartData.map((entry) => (
                          <Cell key={entry.id} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          formatCurrency(Number(value), currencyCode),
                          name,
                        ]}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    {definitionsLoading
                      ? 'Loading budget distribution...'
                      : 'Add a budget definition to see distribution'}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t pt-6">
              <h4 className="font-semibold">Category Budgets</h4>
              {definitionsLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading budgets...
                </p>
              ) : sortedDefinitions.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {sortedDefinitions.map((definition) => {
                    const amount = toNumber(definition.amount)
                    const percentage =
                      totalDefinitionBudget > 0
                        ? (amount / totalDefinitionBudget) * 100
                        : 0
                    return (
                      <EditableBudgetCard
                        key={definition.id}
                        categoryName={
                          definition.category?.name ?? definition.name
                        }
                        allocated={amount}
                        currencyCode={currencyCode}
                        percentage={percentage}
                        onSave={(newValue) =>
                          handleSaveDefinition(definition.id, newValue)
                        }
                        onArchive={() => handleArchiveDefinition(definition.id)}
                      />
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No active recurring budgets. Create one to see it here.
                </p>
              )}
            </div>

            {archivedDefinitions.length > 0 && (
              <div className="space-y-3 border-t pt-6">
                <h4 className="text-sm font-semibold uppercase text-muted-foreground">
                  Archived
                </h4>
                <div className="space-y-3">
                  {archivedDefinitions.map((definition) => (
                    <div
                      key={definition.id}
                      className="flex flex-col gap-3 rounded-lg border border-dashed p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <h5 className="text-base font-semibold">
                          {definition.name}
                        </h5>
                        <p className="text-sm text-muted-foreground">
                          {definition.category?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(
                            toNumber(definition.amount),
                            currencyCode
                          )}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={reactivateDefinition.isPending}
                          onClick={() =>
                            void handleReactivateDefinition(definition.id)
                          }
                        >
                          Reactivate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {!isLoading && (!budgets || budgets.length === 0) && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">
                No budgets found. Create your first budget to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
