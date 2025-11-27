import { router, householdProcedure } from '../trpc'
import { TransactionService } from '@/services/transaction.service'
import {
  listTransactionsSchema,
  getTransactionByIdSchema,
  createTransactionSchema,
  updateTransactionSchema,
  deleteTransactionSchema,
  createBulkTransactionsSchema,
  createTransferSchema,
  markAsReviewedSchema,
  unlinkDuplicateSchema,
} from '../schemas/transaction.schema'

export const transactionRouter = router({
  list: householdProcedure
    .input(listTransactionsSchema)
    .query(async ({ ctx, input }) => {
      return TransactionService.list(ctx.householdId!, input)
    }),

  getById: householdProcedure
    .input(getTransactionByIdSchema)
    .query(async ({ ctx, input }) => {
      return TransactionService.getById(ctx.householdId!, input.id)
    }),

  getLatest: householdProcedure.query(async ({ ctx }) => {
    return TransactionService.getLatest(ctx.householdId!)
  }),

  create: householdProcedure
    .input(createTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      return TransactionService.create(ctx.householdId!, ctx.user!.id, input)
    }),

  update: householdProcedure
    .input(updateTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return TransactionService.update(ctx.householdId!, id, data)
    }),

  delete: householdProcedure
    .input(deleteTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      return TransactionService.remove(ctx.householdId!, input.id)
    }),

  createBulk: householdProcedure
    .input(createBulkTransactionsSchema)
    .mutation(async ({ ctx, input }) => {
      // Extract userId from first transaction if provided, or use current user
      const defaultUserId = input.transactions[0]?.userId ?? ctx.user!.id
      return TransactionService.createBulk(
        ctx.householdId!,
        ctx.user!.id,
        input.transactions,
        defaultUserId
      )
    }),

  createTransfer: householdProcedure
    .input(createTransferSchema)
    .mutation(async ({ ctx, input }) => {
      return TransactionService.createTransfer(
        ctx.householdId!,
        ctx.user!.id,
        input
      )
    }),

  markAsReviewed: householdProcedure
    .input(markAsReviewedSchema)
    .mutation(async ({ ctx, input }) => {
      return TransactionService.markAsReviewed(
        ctx.householdId!,
        input.transactionIds
      )
    }),

  unlinkDuplicate: householdProcedure
    .input(unlinkDuplicateSchema)
    .mutation(async ({ ctx, input }) => {
      return TransactionService.unlinkDuplicate(
        ctx.householdId!,
        input.transactionId
      )
    }),
})
