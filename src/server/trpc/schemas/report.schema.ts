import { z } from 'zod'
import { ReportPeriod, ReportStatus } from '@prisma/client'
import {
  budgetSuggestionSchema,
  narrativeItemSchema,
  reportAnalyticsSchema,
} from '@/services/report-generation.service/types'
import { transactionSchema } from './transaction.schema'
// Report Period Enum
export const reportPeriodSchema = z.nativeEnum(ReportPeriod)

// Report Status Enum
export const reportStatusSchema = z.nativeEnum(ReportStatus)

// List Reports Input
export const listReportsSchema = z
  .object({
    period: reportPeriodSchema.optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    status: reportStatusSchema.optional(),
  })
  .optional()

// Get Report By ID Input
export const getReportByIdSchema = z.object({
  id: z.string().uuid(),
})

// Generate Report Input
export const generateReportSchema = z.object({
  period: reportPeriodSchema,
  startDate: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]),
  isInitial: z.boolean().optional(),
})

// Budget Suggestion Allocation Schema
export const budgetSuggestionAllocationSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number(),
})

// Primary report snapshot stored in Report.data
export const reportDataSchema = z.object({
  totals: z.object({
    income: z.number(),
    expenses: z.number(),
    savingsRate: z.number(), // 0..1
  }),
  categories: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      color: z.string().optional(),
      icon: z.string().optional(),
      spent: z.number(),
      hasBudget: z.boolean(),
      budgetAmount: z.number().optional(),
      remaining: z.number().optional(),
      percentUsed: z.number().optional(),
      transactions: z.array(transactionSchema).optional(),
    })
  ),
  llm: z.object({
    budgetSuggestions: z.array(budgetSuggestionSchema),
    behaviorPatterns: z.array(narrativeItemSchema).nullable().optional(),
    risks: z.array(narrativeItemSchema).nullable().optional(),
    opportunities: z.array(narrativeItemSchema).nullable().optional(),
    potentialIssues: z.array(z.string()).nullable().optional(),
    recommendedActions: z.array(z.string()).nullable().optional(),
  }),
  meta: z
    .object({
      currencyCode: z.string().length(3).optional(),
      label: z.string().optional(),
    })
    .optional(),
  analytics: reportAnalyticsSchema.optional(),
})

// Router inputs for setting/merging report data
export const setReportDataSchema = z.object({
  id: z.string().uuid(),
  data: reportDataSchema,
  transactionCount: z.number().int().nonnegative().optional(),
})

// Note: no merge endpoint for now; updates should write full snapshots.

// Approve Budget Suggestion Input
export const approveBudgetSuggestionSchema = z.object({
  reportId: z.string().uuid(),
  suggestionId: z.string(),
  editedData: z
    .object({
      name: z.string().optional(),
      amount: z.number().optional(),
    })
    .optional(),
})

// Reject Budget Suggestion Input
export const rejectBudgetSuggestionSchema = z.object({
  reportId: z.string().uuid(),
  suggestionId: z.string(),
})

export const reportOpportunitySchema = z.object({
  period: reportPeriodSchema,
  startDate: z.string(),
  endDate: z.string(),
  transactionCount: z.number().int().nonnegative(),
})

export const reportOpportunitiesResultSchema = z.object({
  monthly: z.array(reportOpportunitySchema),
  weekly: reportOpportunitySchema.nullish(),
})

// Type exports
export type ListReportsInput = z.infer<typeof listReportsSchema>
export type GetReportByIdInput = z.infer<typeof getReportByIdSchema>
export type GenerateReportInput = z.infer<typeof generateReportSchema>
export type ApproveBudgetSuggestionInput = z.infer<
  typeof approveBudgetSuggestionSchema
>
export type RejectBudgetSuggestionInput = z.infer<
  typeof rejectBudgetSuggestionSchema
>
export type BudgetSuggestionAllocation = z.infer<
  typeof budgetSuggestionAllocationSchema
>
export type BudgetSuggestion = z.infer<typeof budgetSuggestionSchema>
export type ReportData = z.infer<typeof reportDataSchema>
export type SetReportDataInput = z.infer<typeof setReportDataSchema>
export type ReportOpportunity = z.infer<typeof reportOpportunitySchema>
export type ReportOpportunitiesResult = z.infer<
  typeof reportOpportunitiesResultSchema
>
