export type AccountType = 'CASH' | 'BANK' | 'CREDIT' | 'OTHER'
export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER'
export type CategoryType = 'EXPENSE' | 'INCOME'
export type ReportPeriod =
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY'
  | 'CUSTOM'
export type ReportStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED'
export type BudgetSuggestionType = 'CREATE' | 'UPDATE'
export type BudgetSuggestionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EDITED'

export interface Account {
  id: string
  name: string
  type: AccountType
  currencyCode: string
  balance: number
  isActive: boolean
}

export interface Category {
  id: string
  name: string
  type: CategoryType
  color?: string
  icon?: string
}

export interface Transaction {
  id: string
  type: TransactionType
  fromAccountId?: string | null
  toAccountId?: string | null
  categoryId?: string | null
  amount: number
  currencyCode: string
  occurredAt: string
  description?: string
  note?: string
}

export interface Budget {
  id: string
  categoryId: string
  name: string
  startDate: string
  endDate: string
  amount: number
  definition?: BudgetDefinition
  category?: {
    id: string
    name: string
    type: CategoryType
  }
  spent?: number
}

export interface BudgetDefinition {
  id: string
  userId: string
  categoryId: string
  name: string
  amount: number
  isActive: boolean
  startDate: string
  archivedAt?: string | null
}

export interface ReportMetrics {
  totalIncome?: number
  totalExpenses?: number
  totalTransfers?: number
  netChange?: number
  averageDailyIncome?: number
  averageDailyExpenses?: number
  savingsRate?: number
  savingsRateChange?: number
  largestExpense?: { amount: number; description: string; categoryId: string }
  largestIncome?: { amount: number; description: string; categoryId: string }
  transactionCount?: { income: number; expense: number; transfer: number }
}

export interface CategoryBreakdownItem {
  categoryId: string
  categoryName: string
  amount: number
  percentage: number
  transactionCount: number
  color?: string
  icon?: string
}

export interface ReportTransaction {
  id: string
  description: string
  amount: number
  occurredAt?: Date
  date?: Date
}

export interface CategoryExpenseDetail {
  categoryId: string
  categoryName: string
  amount: number
  percentage: number
  color?: string | null
  transactions?: ReportTransaction[]
}

export interface CategoryBreakdown {
  expenses?: CategoryExpenseDetail[]
  income?: CategoryBreakdownItem[]
}

export interface BudgetAllocation {
  categoryId: string
  categoryName: string
  allocated: number
  spent: number
  transactions?: ReportTransaction[]
  color?: string | null
}

export interface CategoryWithoutBudget {
  categoryId: string
  categoryName: string
  transactions: ReportTransaction[]
  color?: string | null
}

export interface BudgetComparison {
  totalAllocated: number
  totalSpent: number
  overallPercentageUsed: number
  allocations?: BudgetAllocation[]
  categoriesWithoutBudgets?: CategoryWithoutBudget[]
}
