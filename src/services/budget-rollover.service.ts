import { db } from '@/db'
import { Prisma } from '@prisma/client'
import {
  calculatePeriodBounds,
  formatPeriodLabel,
  normalizePeriodStart,
} from '@/lib/budget/period'
import { HouseholdService } from './household.service'
import { PreferenceService } from './preference.service'

type DefinitionWithCategory = Prisma.BudgetDefinitionGetPayload<{
  include: { category: true }
}>

type BudgetWithRelations = Prisma.BudgetGetPayload<{
  include: { category: true; definition: true }
}>

export class BudgetRolloverService {
  /**
   * Get budgetStartDay from household owner's preferences
   */
  static async getBudgetStartDay(householdId: string): Promise<number> {
    const household = await HouseholdService.getById(householdId)
    if (household && household.members.length > 0) {
      const owner = household.members.find((m) => m.role === 'OWNER')
      const member = owner || household.members[0]
      if (member) {
        const preference = await PreferenceService.get(member.user.id)
        if (preference?.budgetStartDay) {
          return preference.budgetStartDay
        }
      }
    }
    return 1 // Default to day 1
  }

  static async ensureCurrentPeriod(
    householdId: string,
    referenceDate = new Date()
  ): Promise<void> {
    const definitions = await db.budgetDefinition.findMany({
      where: { householdId, isActive: true },
      include: { category: true },
    })

    const budgetStartDay = await this.getBudgetStartDay(householdId)

    for (const definition of definitions) {
      await this.ensureBudgetForDefinition(definition, {
        referenceDate,
        budgetStartDay,
      })
    }
  }

  static async ensureBudgetForDefinition(
    definition: DefinitionWithCategory,
    options?: {
      periodStart?: Date
      referenceDate?: Date
      budgetStartDay?: number
    }
  ): Promise<BudgetWithRelations | null> {
    // Get budgetStartDay from options or fetch from preferences
    let budgetStartDay = options?.budgetStartDay
    if (budgetStartDay === undefined) {
      budgetStartDay = await this.getBudgetStartDay(definition.householdId)
    }

    const reference =
      options?.periodStart ?? options?.referenceDate ?? new Date()
    const periodStart = normalizePeriodStart(reference, budgetStartDay)

    const anchorStart = normalizePeriodStart(
      definition.startDate,
      budgetStartDay
    )

    if (periodStart.getTime() < anchorStart.getTime()) {
      return null
    }

    const { end: periodEnd } = calculatePeriodBounds(
      periodStart,
      budgetStartDay
    )

    const existing = await db.budget.findFirst({
      where: {
        definitionId: definition.id,
        startDate: periodStart,
        endDate: periodEnd,
      },
      include: { category: true, definition: true },
    })

    if (existing) {
      return existing
    }

    const amount = Number(definition.amount)

    const periodLabel = formatPeriodLabel(periodStart)
    const baseName = definition.name || definition.category?.name || 'Budget'
    const name = `${baseName} - ${periodLabel}`

    const created = await db.budget.create({
      data: {
        householdId: definition.householdId,
        categoryId: definition.categoryId,
        definitionId: definition.id,
        name,
        startDate: periodStart,
        endDate: periodEnd,
        amount,
      },
      include: { category: true, definition: true },
    })

    return created
  }

  static async ensureBudgetsForDefinitions(
    definitions: DefinitionWithCategory[],
    referenceDate = new Date(),
    budgetStartDay?: number
  ): Promise<void> {
    await Promise.all(
      definitions.map((definition) =>
        this.ensureBudgetForDefinition(definition, {
          referenceDate,
          budgetStartDay,
        })
      )
    )
  }
}
