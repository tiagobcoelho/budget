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

export const narrativeItemSchema = z.object({
  title: z.string(),
  description: z.string(),
})

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

// Base LLM report schema shared across report types
export const baseReportSchema = z.object({})

const reportWithBudgetsSchema = baseReportSchema.extend({
  budgetSuggestions: z
    .array(budgetSuggestionSchema)
    .describe(
      'Array of budget suggestions. Suggest creating budgets for categories with significant spending that lack budgets. Suggest updating budgets that are consistently exceeded or too restrictive. Limit to 3-5 most impactful suggestions.'
    ),
})

const reportNarrativesSchema = z.object({
  behaviorPatterns: z
    .array(narrativeItemSchema)
    .min(1)
    .describe('LLM-authored behavior insights grounded in analytics evidence.'),
  risks: z
    .array(narrativeItemSchema)
    .min(1)
    .describe('LLM-authored risk callouts based on analytics evidence.'),
  opportunities: z
    .array(narrativeItemSchema)
    .min(1)
    .describe('LLM-authored opportunity callouts based on analytics evidence.'),
})

const reportWithBudgetsAndNarrativesSchema = reportWithBudgetsSchema.extend(
  reportNarrativesSchema.shape
)

export const initialReportSchema = reportWithBudgetsAndNarrativesSchema

export const monthlyReportSchema = reportWithBudgetsAndNarrativesSchema

export const weeklyReportSchema = baseReportSchema.extend({
  potentialIssues: z
    .array(z.string())
    .min(1)
    .describe('List of concrete issues or risks observed this week.'),
  recommendedActions: z
    .array(z.string())
    .min(1)
    .describe('Specific actions to take in the coming week.'),
})

export type BaseGeneratedReport = z.infer<typeof baseReportSchema>
export type GeneratedReportWithBudgets = z.infer<typeof reportWithBudgetsSchema>
export type GeneratedReportWithNarratives = z.infer<
  typeof reportWithBudgetsAndNarrativesSchema
>
export type WeeklyGuidanceReport = z.infer<typeof weeklyReportSchema>
export type InitialGeneratedReport = z.infer<typeof initialReportSchema>
export type MonthlyGeneratedReport = z.infer<typeof monthlyReportSchema>
export type WeeklyGeneratedReport = z.infer<typeof weeklyReportSchema>

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

export interface ReportGenerationContext {
  monthlyTransactions?: TransactionData[]
  previousPeriodTransactions?: TransactionData[]
  rollingTransactions?: TransactionData[]
}

export const monthAtGlanceSchema = z.object({
  totalIncome: z.number(),
  totalExpenses: z.number(),
  savingsAmount: z.number(),
  savingsRate: z.number(),
  previousIncome: z.number().optional(),
  previousExpenses: z.number().optional(),
  previousSavingsRate: z.number().optional(),
})

export const categoryTotalSchema = z.object({
  categoryId: z.string(),
  name: z.string(),
  type: z.enum(['EXPENSE', 'INCOME']),
  amount: z.number(),
  previousAmount: z.number().optional(),
  changePct: z.number().nullable().optional(),
  transactionCount: z.number(),
  hasBudget: z.boolean(),
  budgetAmount: z.number().nullable().optional(),
})

export const categoryHistorySchema = z.object({
  categoryId: z.string(),
  name: z.string(),
  history: z.array(
    z.object({
      month: z.string(),
      amount: z.number(),
    })
  ),
  average: z.number().nullable(),
  volatility: z.number().nullable(),
})

export const incomeSourceMetricSchema = z.object({
  categoryId: z.string().nullable(),
  name: z.string(),
  amount: z.number(),
  changePct: z.number().nullable(),
})

export const budgetAdherenceBreakdownSchema = z.object({
  budgetId: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  budgeted: z.number(),
  spent: z.number(),
  ratio: z.number(),
  status: z.enum(['UNDER', 'ON_TRACK', 'OVER']),
  score: z.number(),
})

export const budgetAdherenceScoreSchema = z.object({
  score: z.number().nullable(),
  grade: z.string().nullable(),
  breakdown: z.array(budgetAdherenceBreakdownSchema),
})

export const spendingPatternsSchema = z.object({
  byDayOfWeek: z.array(
    z.object({
      dayIndex: z.number().int().min(0).max(6),
      label: z.string(),
      amount: z.number(),
    })
  ),
  weekendVsWeekday: z.object({
    weekend: z.number(),
    weekday: z.number(),
  }),
  weeklyTotals: z.array(
    z.object({
      weekLabel: z.string(),
      amount: z.number(),
    })
  ),
  lastSevenDaysTotal: z.number(),
  averageSevenDay: z.number(),
})

export const monthlyReportAnalyticsSchema = z.object({
  monthAtGlance: monthAtGlanceSchema,
  categoryTotals: z.array(categoryTotalSchema),
  categoryHistory: z.array(categoryHistorySchema),
  incomeSources: z.array(incomeSourceMetricSchema),
  budgetAdherence: budgetAdherenceScoreSchema,
  spendingPatterns: spendingPatternsSchema,
})

export const budgetCadenceSchema = z.enum(['STEADY', 'LUMPY', 'UNKNOWN'])

export const projectionConfidenceSchema = z.enum(['LOW', 'MEDIUM', 'HIGH'])

export const projectionStatusSchema = z.enum([
  'ON_TRACK',
  'AT_RISK',
  'OVER',
  'LUMPY',
  'INSUFFICIENT_DATA',
])

export const weeklyBudgetProjectionCategorySchema = z.object({
  budgetId: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  budgetAmount: z.number(),
  spentThisWeek: z.number(),
  spentThisMonth: z.number(),
  projectedMonthEnd: z.number().nullable(),
  projectedVariance: z.number().nullable(),
  pacingStatus: projectionStatusSchema,
  cadence: budgetCadenceSchema,
  confidence: projectionConfidenceSchema,
  notes: z.string().nullable(),
})

export const weeklyBudgetProjectionSummarySchema = z.object({
  projectedMonthEndTotal: z.number().nullable(),
  actualMonthToDate: z.number(),
  totalBudget: z.number(),
  projectedVariance: z.number().nullable(),
})

export const weeklyBudgetProjectionAnalyticsSchema = z.object({
  generatedAt: z.string(),
  daysIntoMonth: z.number(),
  daysRemaining: z.number(),
  daysInMonth: z.number(),
  categories: z.array(weeklyBudgetProjectionCategorySchema),
  summary: weeklyBudgetProjectionSummarySchema,
})

export const reportAnalyticsSchema = z.object({
  monthly: monthlyReportAnalyticsSchema.optional(),
  weeklyProjection: weeklyBudgetProjectionAnalyticsSchema.optional(),
})

export type MonthAtGlanceMetrics = z.infer<typeof monthAtGlanceSchema>
export type CategoryTotal = z.infer<typeof categoryTotalSchema>
export type CategoryHistory = z.infer<typeof categoryHistorySchema>
export type IncomeSourceMetric = z.infer<typeof incomeSourceMetricSchema>
export type BudgetAdherenceBreakdown = z.infer<
  typeof budgetAdherenceBreakdownSchema
>
export type BudgetAdherenceScore = z.infer<typeof budgetAdherenceScoreSchema>
export type SpendingPatterns = z.infer<typeof spendingPatternsSchema>
export type MonthlyReportAnalytics = z.infer<
  typeof monthlyReportAnalyticsSchema
>
export type BudgetCadence = z.infer<typeof budgetCadenceSchema>
export type ProjectionConfidence = z.infer<typeof projectionConfidenceSchema>
export type ProjectionStatus = z.infer<typeof projectionStatusSchema>
export type WeeklyBudgetProjectionCategory = z.infer<
  typeof weeklyBudgetProjectionCategorySchema
>
export type WeeklyBudgetProjectionSummary = z.infer<
  typeof weeklyBudgetProjectionSummarySchema
>
export type WeeklyBudgetProjectionAnalytics = z.infer<
  typeof weeklyBudgetProjectionAnalyticsSchema
>
export type ReportAnalytics = z.infer<typeof reportAnalyticsSchema>

export type AugmentedGeneratedReport<
  TReport extends BaseGeneratedReport = BaseGeneratedReport,
> = TReport & {
  analytics?: ReportAnalytics
}
