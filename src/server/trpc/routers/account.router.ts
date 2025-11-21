import { router, householdProcedure } from '../trpc'
import { AccountService } from '@/services/account.service'
import {
  listAccountsSchema,
  getAccountByIdSchema,
  createAccountSchema,
  updateAccountSchema,
  deleteAccountSchema,
  getSavingsRateSchema,
  createBulkAccountsSchema,
  deleteBulkAccountsSchema,
} from '../schemas/account.schema'

export const accountRouter = router({
  list: householdProcedure
    .input(listAccountsSchema)
    .query(async ({ ctx, input }) => {
      return AccountService.list(ctx.householdId!, input ?? {})
    }),

  getById: householdProcedure
    .input(getAccountByIdSchema)
    .query(async ({ ctx, input }) => {
      return AccountService.getById(ctx.householdId!, input.id)
    }),

  create: householdProcedure
    .input(createAccountSchema)
    .mutation(async ({ ctx, input }) => {
      return AccountService.create(ctx.householdId!, input)
    }),

  update: householdProcedure
    .input(updateAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return AccountService.update(ctx.householdId!, id, data)
    }),

  delete: householdProcedure
    .input(deleteAccountSchema)
    .mutation(async ({ ctx, input }) => {
      return AccountService.remove(ctx.householdId!, input.id)
    }),

  getNetWorth: householdProcedure.query(async ({ ctx }) => {
    return AccountService.getNetWorth(ctx.householdId!)
  }),

  getSavingsRate: householdProcedure
    .input(getSavingsRateSchema)
    .query(async ({ ctx, input }) => {
      return AccountService.getSavingsRate(ctx.householdId!, {
        from: input.from instanceof Date ? input.from : new Date(input.from),
        to: input.to instanceof Date ? input.to : new Date(input.to),
      })
    }),

  createBulk: householdProcedure
    .input(createBulkAccountsSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) {
        throw new Error('At least one account is required')
      }
      const accounts = await Promise.all(
        input.map((account) =>
          AccountService.create(ctx.householdId!, {
            name: account.name,
            type: account.type,
            currencyCode: account.currencyCode,
          })
        )
      )
      return accounts
    }),

  deleteBulk: householdProcedure
    .input(deleteBulkAccountsSchema)
    .mutation(async ({ ctx, input }) => {
      return AccountService.removeBulk(ctx.householdId!, input)
    }),
})
