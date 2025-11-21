import { router, householdProcedure } from '../trpc'
import { BudgetService } from '@/services/budget.service'
import { BudgetDefinitionService } from '@/services/budget-definition.service'
import { BudgetRolloverService } from '@/services/budget-rollover.service'
import {
  listBudgetsSchema,
  budgetDefinitionsSchema,
  budgetDefinitionIdSchema,
  getBudgetByIdSchema,
  createBudgetSchema,
  createBudgetsBulkSchema,
  updateBudgetSchema,
  deleteBudgetSchema,
  updateBudgetDefinitionSchema,
} from '../schemas/budget.schema'

export const budgetRouter = router({
  list: householdProcedure
    .input(listBudgetsSchema)
    .query(async ({ ctx, input }) => {
      const range =
        input?.from && input?.to
          ? { from: input.from, to: input.to }
          : undefined
      return BudgetService.list(ctx.householdId!, range)
    }),

  listWithTransactions: householdProcedure
    .input(listBudgetsSchema)
    .query(async ({ ctx, input }) => {
      const range =
        input?.from && input?.to
          ? { from: input.from, to: input.to }
          : undefined
      return BudgetService.listWithTransactions(ctx.householdId!, range)
    }),

  definitions: householdProcedure
    .input(budgetDefinitionsSchema)
    .query(async ({ ctx, input }) => {
      return BudgetDefinitionService.listForHousehold(ctx.householdId!, {
        includeArchived: input?.includeArchived,
      })
    }),

  archiveDefinition: householdProcedure
    .input(budgetDefinitionIdSchema)
    .mutation(async ({ input }) => {
      await BudgetDefinitionService.archive(input.id)
      return true
    }),

  reactivateDefinition: householdProcedure
    .input(budgetDefinitionIdSchema)
    .mutation(async ({ input }) => {
      await BudgetDefinitionService.update(input.id, { isActive: true })
      return true
    }),

  updateDefinition: householdProcedure
    .input(updateBudgetDefinitionSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return BudgetDefinitionService.update(id, data)
    }),

  syncCurrentPeriod: householdProcedure.mutation(async ({ ctx }) => {
    await BudgetRolloverService.ensureCurrentPeriod(ctx.householdId!)
    return true
  }),

  getById: householdProcedure
    .input(getBudgetByIdSchema)
    .query(async ({ ctx, input }) => {
      return BudgetService.getById(ctx.householdId!, input.id)
    }),

  create: householdProcedure
    .input(createBudgetSchema)
    .mutation(async ({ ctx, input }) => {
      return BudgetService.create(ctx.householdId!, input)
    }),

  createBulk: householdProcedure
    .input(createBudgetsBulkSchema)
    .mutation(async ({ ctx, input }) => {
      return BudgetService.createBulk(ctx.householdId!, input.items)
    }),

  update: householdProcedure
    .input(updateBudgetSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return BudgetService.update(ctx.householdId!, id, data)
    }),

  delete: householdProcedure
    .input(deleteBudgetSchema)
    .mutation(async ({ ctx, input }) => {
      return BudgetService.remove(ctx.householdId!, input.id)
    }),
})
