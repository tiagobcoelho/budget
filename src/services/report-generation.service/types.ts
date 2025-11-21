import { z } from 'zod'

export enum BudgetSuggestionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
}

export enum BudgetSuggestionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Shared schema for budget suggestion
export const budgetSuggestionSchema = z.object({
  id: z
    .string()
    .optional()
    .describe(
      'Unique identifier for this suggestion (will be auto-generated if not provided or invalid)'
    ),
  type: z
    .nativeEnum(BudgetSuggestionType)
    .describe('Whether to create a new budget or update an existing one'),
  budgetId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .describe('ID of existing budget (only for UPDATE type)'),
  suggestion: z
    .object({
      name: z.string().describe('Name for the new budget'),
      categoryId: z
        .string()
        .uuid()
        .describe(
          'Category ID for this budget (required - must use an existing category ID from the list provided)'
        ),
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe('Start date in ISO format YYYY-MM-DD'),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe('End date in ISO format YYYY-MM-DD'),
      amount: z.number().positive().describe('Total budget amount'),
    })
    .optional()
    .nullable()
    .describe('Budget suggestion data (for CREATE type)'),
  currentBudget: z
    .object({
      name: z.string(),
      categoryId: z.string().uuid(),
      amount: z.number(),
    })
    .optional()
    .nullable()
    .describe('Current budget data (for UPDATE type)'),
  suggestedChanges: z
    .object({
      amount: z
        .number()
        .positive()
        .optional()
        .describe('Suggested new total amount'),
      categoryId: z
        .string()
        .uuid()
        .optional()
        .describe('Suggested category ID change (optional)'),
    })
    .optional()
    .nullable()
    .describe('Suggested changes (for UPDATE type)'),
  reasoning: z.string().describe('Explanation of why this suggestion was made'),
  expectedImpact: z
    .string()
    .optional()
    .describe('Expected impact of implementing this suggestion'),
  status: z
    .nativeEnum(BudgetSuggestionStatus)
    .describe('Status of the suggestion'),
})

// Shared schema for the complete report
export const reportSchema = z.object({
  summary: z
    .array(z.string())
    .describe(
      'An array of 3-5 short bullet-point strings summarizing key financial insights for this period'
    ),
  insights: z
    .array(z.string())
    .describe(
      'An array of 3-5 paragraph-length strings providing detailed analysis of spending patterns, trends, unusual activity, and notable observations'
    ),
  recommendations: z
    .array(z.string())
    .describe(
      'An array of 3-5 actionable bullet-point strings with recommendations to improve financial health based on the analysis'
    ),
  budgetSuggestions: z
    .array(budgetSuggestionSchema)
    .describe(
      'Array of budget suggestions. Suggest creating budgets for categories with significant spending that lack budgets. Suggest updating budgets that are consistently exceeded or too restrictive. Limit to 3-5 most impactful suggestions.'
    ),
})

export type GeneratedReport = z.infer<typeof reportSchema>

export interface TransactionData {
  id: string
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  amount: number
  occurredAt: string
  description: string | null
  categoryId: string | null
  categoryName: string | null
}

export interface CategoryData {
  id: string
  name: string
  type: 'EXPENSE' | 'INCOME'
}

export interface BudgetData {
  id: string
  name: string
  categoryId: string
  startDate: string
  endDate: string
  amount: number
}

export interface AccountData {
  id: string
  name: string
  type: string
}
