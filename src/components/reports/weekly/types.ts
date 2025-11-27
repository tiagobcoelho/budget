import type { Transaction } from '@/server/trpc/schemas/transaction.schema'

export interface WeeklyExpenseDetail {
  categoryId: string
  categoryName: string
  amount: number
  color?: string | null
  transactions: Transaction[]
}
