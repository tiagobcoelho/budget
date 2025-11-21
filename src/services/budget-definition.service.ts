import { db } from '@/db'
import { Prisma } from '@prisma/client'
import {
  calculatePeriodBounds,
  normalizePeriodStart,
} from '@/lib/budget/period'

type DefinitionWithCategory = Prisma.BudgetDefinitionGetPayload<{
  include: { category: true }
}>

export class BudgetDefinitionService {
  static async upsert({
    householdId,
    categoryId,
    name,
    amount,
    startDate,
    budgetStartDay = 1,
  }: {
    householdId: string
    categoryId: string
    name: string
    amount: number
    startDate: Date
    budgetStartDay?: number
  }): Promise<DefinitionWithCategory> {
    const normalizedStart = normalizePeriodStart(startDate, budgetStartDay)

    const existing = await db.budgetDefinition.findFirst({
      where: { householdId, categoryId },
      include: { category: true },
    })

    if (existing) {
      const startBounds = calculatePeriodBounds(
        existing.startDate,
        budgetStartDay
      )
      const shouldUpdateStart =
        normalizedStart.getTime() < startBounds.start.getTime()

      return db.budgetDefinition.update({
        where: { id: existing.id },
        data: {
          name,
          amount,
          isActive: true,
          archivedAt: null,
          ...(shouldUpdateStart ? { startDate: normalizedStart } : {}),
          updatedAt: new Date(),
        },
        include: { category: true },
      })
    }

    return db.budgetDefinition.create({
      data: {
        householdId,
        categoryId,
        name,
        amount,
        startDate: normalizedStart,
      },
      include: { category: true },
    })
  }

  static async update(
    id: string,
    data: Partial<{
      name: string
      amount: number
      isActive: boolean
      startDate: Date
    }>,
    budgetStartDay: number = 1
  ): Promise<DefinitionWithCategory> {
    const current = await db.budgetDefinition.findUnique({
      where: { id },
    })

    if (!current) {
      throw new Error('Budget definition not found')
    }

    const updateData: Prisma.BudgetDefinitionUpdateInput = {
      updatedAt: new Date(),
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive
      updateData.archivedAt = data.isActive ? null : new Date()
    }
    if (data.startDate) {
      updateData.startDate = normalizePeriodStart(
        data.startDate,
        budgetStartDay
      )
    }

    return db.budgetDefinition.update({
      where: { id },
      data: updateData,
      include: { category: true },
    })
  }

  static async archive(id: string) {
    return db.budgetDefinition.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  static async getById(id: string) {
    return db.budgetDefinition.findUnique({
      where: { id },
      include: { category: true },
    })
  }

  static async listActive(householdId: string) {
    return db.budgetDefinition.findMany({
      where: { householdId, isActive: true },
      include: { category: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  static async listForHousehold(
    householdId: string,
    options?: { includeArchived?: boolean }
  ) {
    return db.budgetDefinition.findMany({
      where: {
        householdId,
        ...(options?.includeArchived ? {} : { isActive: true }),
      },
      include: { category: true },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    })
  }
}
