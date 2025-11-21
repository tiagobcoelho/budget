import { db } from '@/db'

/**
 * Compute the total amount spent for a category within a date range.
 */
export async function computeCategorySpend(
  householdId: string,
  categoryId: string,
  from: Date,
  to: Date
): Promise<number> {
  const result = await db.transaction.aggregate({
    where: {
      householdId,
      categoryId,
      type: 'EXPENSE',
      occurredAt: { gte: from, lte: to },
    },
    _sum: { amount: true },
  })

  return Number(result._sum.amount ?? 0)
}
