import { router, householdProcedure } from '../trpc'
import { ReportService } from '@/services/report.service'
import { ReportOpportunityService } from '@/services/report-opportunity.service'
import {
  listReportsSchema,
  getReportByIdSchema,
  generateReportSchema,
  setReportDataSchema,
  approveBudgetSuggestionSchema,
  rejectBudgetSuggestionSchema,
  reportOpportunitiesResultSchema,
} from '../schemas/report.schema'

export const reportRouter = router({
  list: householdProcedure
    .input(listReportsSchema)
    .query(async ({ ctx, input }) => {
      return ReportService.list(ctx.householdId!, input)
    }),

  getById: householdProcedure
    .input(getReportByIdSchema)
    .query(async ({ ctx, input }) => {
      return ReportService.getById(ctx.householdId!, input.id)
    }),

  getOpportunities: householdProcedure.query(async ({ ctx }) => {
    const result = await ReportOpportunityService.list(ctx.householdId!)
    return reportOpportunitiesResultSchema.parse(result)
  }),

  generate: householdProcedure
    .input(generateReportSchema)
    .mutation(async ({ ctx, input }) => {
      return ReportService.create(ctx.householdId!, {
        period: input.period,
        startDate:
          typeof input.startDate === 'string'
            ? input.startDate
            : input.startDate.toISOString(),
        endDate:
          typeof input.endDate === 'string'
            ? input.endDate
            : input.endDate.toISOString(),
        isInitial: input.isInitial ?? false,
      })
    }),

  setData: householdProcedure
    .input(setReportDataSchema)
    .mutation(async ({ input }) => {
      return ReportService.setData(input.id, input.data, input.transactionCount)
    }),

  approveBudgetSuggestion: householdProcedure
    .input(approveBudgetSuggestionSchema)
    .mutation(async ({ ctx, input }) => {
      return ReportService.approveBudgetSuggestion(ctx.householdId!, {
        reportId: input.reportId,
        suggestionId: input.suggestionId,
        editedData: input.editedData,
      })
    }),

  rejectBudgetSuggestion: householdProcedure
    .input(rejectBudgetSuggestionSchema)
    .mutation(async ({ ctx, input }) => {
      return ReportService.rejectBudgetSuggestion(ctx.householdId!, {
        reportId: input.reportId,
        suggestionId: input.suggestionId,
      })
    }),
})
