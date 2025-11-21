import { db } from '@/db'
import { PreferenceService } from './preference.service'
import { HouseholdService } from './household.service'
import { computeCategorySpend } from '@/lib/budget/metrics'
import { BudgetRolloverService } from './budget-rollover.service'
import { BudgetDefinitionService } from './budget-definition.service'
import { calculatePeriodBounds } from '@/lib/budget/period'

export class BudgetService {
  /**
   * Check if a budget overlaps with existing budgets for the same category
   */
  static async checkBudgetOverlap(
    householdId: string,
    categoryId: string,
    startDate: Date,
    endDate: Date,
    excludeBudgetId?: string
  ): Promise<boolean> {
    const overlapping = await db.budget.findFirst({
      where: {
        householdId,
        categoryId,
        id: excludeBudgetId ? { not: excludeBudgetId } : undefined,
        OR: [
          // New budget starts within existing budget
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } },
            ],
          },
          // New budget ends within existing budget
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } },
            ],
          },
          // New budget completely contains existing budget
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } },
            ],
          },
        ],
      },
    })
    return !!overlapping
  }

  /**
   * Compute spent amount for a specific budget (category + date range)
   */
  static async computeSpentForBudget(
    householdId: string,
    categoryId: string,
    from: Date,
    to: Date
  ): Promise<number> {
    return computeCategorySpend(householdId, categoryId, from, to)
  }

  /**
   * List all budgets with category and spent amounts
   */
  static async list(householdId: string, range?: { from: string; to: string }) {
    await BudgetRolloverService.ensureCurrentPeriod(householdId)

    const budgets = await db.budget.findMany({
      where: {
        householdId,
        ...(range
          ? {
              AND: [
                { startDate: { lte: new Date(range.to) } },
                { endDate: { gte: new Date(range.from) } },
              ],
            }
          : {}),
      },
      include: { category: true, definition: true },
      orderBy: { startDate: 'desc' },
    })

    // Compute spent amounts for all budgets
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.computeSpentForBudget(
          householdId,
          budget.categoryId,
          budget.startDate,
          budget.endDate
        )
        return {
          ...budget,
          spent,
        }
      })
    )

    return budgetsWithSpent
  }

  /**
   * List budgets with transactions for a date range (for dashboard)
   */
  static async listWithTransactions(
    householdId: string,
    range?: { from: string; to: string }
  ) {
    const budgets = await this.list(householdId, range)

    // Fetch transactions for all budgets
    const budgetsWithTransactions = await Promise.all(
      budgets.map(async (budget) => {
        const transactions = await db.transaction.findMany({
          where: {
            householdId,
            categoryId: budget.categoryId,
            type: 'EXPENSE',
            occurredAt: {
              gte: budget.startDate,
              lte: budget.endDate,
            },
          },
          orderBy: { occurredAt: 'desc' },
        })

        return {
          ...budget,
          transactions,
        }
      })
    )

    return budgetsWithTransactions
  }

  /**
   * Get budget by ID with category and spent amount
   */
  static async getById(householdId: string, id: string) {
    const budget = await db.budget.findFirst({
      where: { id, householdId },
      include: { category: true, definition: true },
    })
    if (!budget) return null

    const spent = await this.computeSpentForBudget(
      householdId,
      budget.categoryId,
      budget.startDate,
      budget.endDate
    )

    return {
      ...budget,
      spent,
    }
  }

  /**
   * Create a new budget
   */
  static async create(
    householdId: string,
    data: {
      categoryId: string
      name?: string
      startDate: string | Date
      endDate: string | Date
      amount: number
    }
  ) {
    // Validate category exists and belongs to household
    const category = await db.category.findFirst({
      where: { id: data.categoryId, householdId },
    })
    if (!category) {
      throw new Error('Category not found or does not belong to user')
    }

    // Validate category is EXPENSE type
    if (category.type !== 'EXPENSE') {
      throw new Error('Budget can only be created for EXPENSE categories')
    }

    const startDate = new Date(data.startDate)

    // Get budgetStartDay from user preferences
    let budgetStartDay = 1 // Default to day 1
    const household = await HouseholdService.getById(householdId)
    if (household && household.members.length > 0) {
      // Try to find owner first, otherwise use first member
      const owner = household.members.find((m) => m.role === 'OWNER')
      const member = owner || household.members[0]

      if (member) {
        const preference = await PreferenceService.get(member.user.id)
        if (preference?.budgetStartDay) {
          budgetStartDay = preference.budgetStartDay
        }
      }
    }

    const periodBounds = calculatePeriodBounds(startDate, budgetStartDay)
    const baseName =
      data.name && data.name.includes(' - ')
        ? data.name.split(' - ')[0]!
        : (data.name ?? category.name)
    const definition = await BudgetDefinitionService.upsert({
      householdId,
      categoryId: data.categoryId,
      name: baseName,
      amount: data.amount,
      startDate: periodBounds.start,
      budgetStartDay,
    })

    const ensured = await BudgetRolloverService.ensureBudgetForDefinition(
      definition,
      { periodStart: periodBounds.start, budgetStartDay }
    )

    if (ensured) {
      return this.getById(householdId, ensured.id)
    }

    // Fallback to fetch created budget if ensure couldn't
    return this.getById(
      householdId,
      (
        await db.budget.findFirstOrThrow({
          where: {
            definitionId: definition.id,
            startDate: periodBounds.start,
          },
        })
      ).id
    )
  }

  /**
   * Create multiple budgets in bulk (best-effort). Returns per-item results.
   */
  static async createBulk(
    householdId: string,
    items: Array<{
      categoryId: string
      name?: string
      startDate: string | Date
      endDate: string | Date
      amount: number
    }>
  ): Promise<
    Array<
      | {
          success: true
          budget: NonNullable<Awaited<ReturnType<typeof BudgetService.getById>>>
          index: number
        }
      | { success: false; error: string; index: number }
    >
  > {
    const results = await Promise.all(
      items.map(async (item, index) => {
        try {
          const created = await BudgetService.create(householdId, item)
          if (!created) {
            throw new Error('Failed to create budget')
          }
          return { success: true as const, budget: created, index }
        } catch (e) {
          const message =
            e instanceof Error
              ? e.message
              : typeof e === 'string'
                ? e
                : 'Unknown error'
          return { success: false as const, error: message, index }
        }
      })
    )
    return results
  }

  /**
   * Update an existing budget
   */
  static async update(
    householdId: string,
    id: string,
    data: Partial<{
      categoryId: string
      name: string
      startDate: string | Date
      endDate: string | Date
      amount: number
    }>
  ) {
    // Get existing budget
    const existingBudget = await db.budget.findFirst({
      where: { id, householdId },
    })
    if (!existingBudget) {
      throw new Error('Budget not found or unauthorized')
    }

    if (existingBudget.definitionId) {
      if (data.categoryId && data.categoryId !== existingBudget.categoryId) {
        throw new Error(
          'Cannot change category for a recurring budget. Archive and create a new budget instead.'
        )
      }

      if (data.startDate || data.endDate) {
        throw new Error('Cannot change the period for a recurring budget.')
      }

      const definitionUpdate: Partial<{
        name: string
        amount: number
      }> = {}

      if (data.name) {
        definitionUpdate.name = data.name
      }
      if (data.amount !== undefined) {
        definitionUpdate.amount = data.amount
      }

      if (Object.keys(definitionUpdate).length > 0) {
        await BudgetDefinitionService.update(
          existingBudget.definitionId,
          definitionUpdate
        )
      }

      await db.budget.update({
        where: { id },
        data: {
          ...('name' in data && data.name ? { name: data.name } : {}),
          ...('amount' in data && data.amount !== undefined
            ? { amount: data.amount }
            : {}),
          updatedAt: new Date(),
        },
      })

      return this.getById(householdId, id)
    }

    // Non-recurring budgets retain previous behaviour
    if (data.categoryId && data.categoryId !== existingBudget.categoryId) {
      const category = await db.category.findFirst({
        where: { id: data.categoryId, householdId },
      })
      if (!category) {
        throw new Error('Category not found or does not belong to user')
      }
      if (category.type !== 'EXPENSE') {
        throw new Error('Budget can only be assigned to EXPENSE categories')
      }
    }

    const categoryId = data.categoryId ?? existingBudget.categoryId
    const startDate = data.startDate
      ? new Date(data.startDate)
      : existingBudget.startDate
    const endDate = data.endDate
      ? new Date(data.endDate)
      : existingBudget.endDate

    if (
      data.categoryId ||
      data.startDate ||
      data.endDate ||
      categoryId !== existingBudget.categoryId
    ) {
      const hasOverlap = await this.checkBudgetOverlap(
        householdId,
        categoryId,
        startDate,
        endDate,
        id
      )
      if (hasOverlap) {
        throw new Error(
          'Budget overlaps with existing budget for this category and period'
        )
      }
    }

    const updated = await db.budget.updateMany({
      where: { id, householdId },
      data: {
        ...('categoryId' in data && data.categoryId
          ? { categoryId: data.categoryId }
          : {}),
        ...('name' in data && data.name ? { name: data.name } : {}),
        ...('startDate' in data && data.startDate
          ? { startDate: new Date(data.startDate) }
          : {}),
        ...('endDate' in data && data.endDate
          ? { endDate: new Date(data.endDate) }
          : {}),
        ...('amount' in data && data.amount !== undefined
          ? { amount: data.amount }
          : {}),
        updatedAt: new Date(),
      },
    })

    if (updated.count === 0) return null

    return this.getById(householdId, id)
  }

  /**
   * Delete a budget
   */
  static async remove(householdId: string, id: string): Promise<boolean> {
    const budget = await db.budget.findFirst({
      where: { id, householdId },
      select: { id: true, definitionId: true, startDate: true },
    })

    if (!budget) {
      return false
    }

    if (budget.definitionId) {
      await BudgetDefinitionService.archive(budget.definitionId)
      await db.budget.deleteMany({
        where: {
          definitionId: budget.definitionId,
          startDate: { gte: budget.startDate },
        },
      })
      return true
    }

    const result = await db.budget.deleteMany({ where: { id, householdId } })
    return result.count > 0
  }
}
