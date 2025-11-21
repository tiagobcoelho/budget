import { db } from '@/db'

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Housing', color: '#3b82f6', icon: '🏠' },
  { name: 'Transportation', color: '#f97316', icon: '🚗' },
  { name: 'Food & Dining', color: '#22c55e', icon: '🍔' },
  { name: 'Health & Fitness', color: '#ec4899', icon: '💪' },
  { name: 'Entertainment & Leisure', color: '#8b5cf6', icon: '🎬' },
  { name: 'Shopping & Personal', color: '#eab308', icon: '🛍️' },
  { name: 'Family & Education', color: '#ef4444', icon: '👨‍👩‍👧‍👦' },
  { name: 'Savings & Investments', color: '#22c55e', icon: '💰' },
  { name: 'Bills & Utilities', color: '#6b7280', icon: '💡' },
  { name: 'Miscellaneous', color: '#6b7280', icon: '📦' },
]

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', color: '#22c55e', icon: '💼' },
  { name: 'Freelance & Side Income', color: '#3b82f6', icon: '💻' },
  { name: 'Investments', color: '#8b5cf6', icon: '📈' },
  { name: 'Gifts & Other Income', color: '#eab308', icon: '🎁' },
]

export class CategoryService {
  static async list(householdId: string) {
    return db.category.findMany({
      where: { householdId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })
  }

  /**
   * Get categories with computed metrics (transaction count, total amount, avg monthly)
   * Uses database aggregation for efficient computation
   */
  static async listWithMetrics(householdId: string) {
    // Get all categories
    const categories = await this.list(householdId)

    // Compute metrics for each category in parallel
    const categoriesWithMetrics = await Promise.all(
      categories.map(async (category) => {
        // Get date range and aggregate metrics in parallel
        const [aggregateResult, dateRange] = await Promise.all([
          db.transaction.aggregate({
            where: {
              householdId,
              categoryId: category.id,
            },
            _count: { id: true },
            _sum: { amount: true },
          }),
          db.transaction.aggregate({
            where: {
              householdId,
              categoryId: category.id,
            },
            _min: { occurredAt: true },
            _max: { occurredAt: true },
          }),
        ])

        const transactionCount = aggregateResult._count.id
        const totalAmount = Number(aggregateResult._sum.amount ?? 0)

        // Calculate average monthly
        let avgMonthly = 0
        if (dateRange._min.occurredAt && dateRange._max.occurredAt) {
          const minDate = dateRange._min.occurredAt.getTime()
          const maxDate = dateRange._max.occurredAt.getTime()
          const daysDiff = Math.max(
            1,
            (maxDate - minDate) / (1000 * 60 * 60 * 24)
          )
          const monthsDiff = Math.max(1, daysDiff / 30)
          avgMonthly = totalAmount / monthsDiff
        }

        return {
          ...category,
          transactionCount,
          totalAmount,
          avgMonthlyAmount: avgMonthly,
        }
      })
    )

    return categoriesWithMetrics
  }

  static async create(
    householdId: string,
    data: {
      name: string
      type: 'EXPENSE' | 'INCOME'
      color?: string | null
      icon?: string | null
    }
  ) {
    return db.category.create({
      data: { ...data, householdId },
    })
  }

  static async update(
    householdId: string,
    id: string,
    data: Partial<{
      name: string
      type: 'EXPENSE' | 'INCOME'
      color: string | null
      icon: string | null
    }>
  ) {
    const updated = await db.category.updateMany({
      where: { id, householdId },
      data: { ...data, updatedAt: new Date() },
    })
    if (updated.count === 0) return null
    return db.category.findUnique({ where: { id } })
  }

  static async remove(householdId: string, id: string): Promise<boolean> {
    const result = await db.category.deleteMany({ where: { id, householdId } })
    return result.count > 0
  }

  static async removeBulk(householdId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0
    }
    const result = await db.category.deleteMany({
      where: {
        id: { in: ids },
        householdId,
      },
    })
    return result.count
  }

  /**
   * Create default categories for a new household
   * This is called when a household is first created
   */
  static async createDefaultCategories(householdId: string): Promise<void> {
    try {
      // Prepare expense categories data
      const expenseCategories = DEFAULT_EXPENSE_CATEGORIES.map((category) => ({
        householdId,
        name: category.name,
        type: 'EXPENSE' as const,
        color: category.color,
        icon: category.icon,
      }))

      // Prepare income categories data
      const incomeCategories = DEFAULT_INCOME_CATEGORIES.map((category) => ({
        householdId,
        name: category.name,
        type: 'INCOME' as const,
        color: category.color,
        icon: category.icon,
      }))

      // Bulk create expense categories
      await db.category.createMany({
        data: expenseCategories,
        skipDuplicates: true, // Skip if category already exists (idempotent)
      })

      // Bulk create income categories
      await db.category.createMany({
        data: incomeCategories,
        skipDuplicates: true, // Skip if category already exists (idempotent)
      })

      console.log(`Default categories created for household ${householdId}`)
    } catch (error) {
      console.error('Error creating default categories:', error)
      // Don't throw - we don't want household creation to fail if categories fail
      // Categories can be created manually if needed
    }
  }
}
