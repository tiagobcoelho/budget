import { z } from 'zod'
import { TransactionType } from '@prisma/client'

// Transaction Type Enum
export const transactionTypeSchema = z.nativeEnum(TransactionType)

export const transactionSchema = z.object({
  id: z.string().uuid(),
  type: transactionTypeSchema,
  amount: z.number(),
  categoryId: z.string().uuid().optional().nullable(),
  occurredAt: z.string(),
  description: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  reviewed: z.boolean().optional(),
  possibleDuplicate: z.boolean().optional(),
  duplicateOfTransactionId: z.string().uuid().optional().nullable(),
  duplicateOf: z
    .object({
      id: z.string().uuid(),
      description: z.string().optional().nullable(),
      amount: z.number(),
      occurredAt: z.preprocess(
        (val) => (val instanceof Date ? val.toISOString() : val),
        z.string()
      ),
    })
    .optional()
    .nullable(),
  createdAt: z.preprocess(
    (val) => (val instanceof Date ? val.toISOString() : val),
    z.string().datetime()
  ),
  updatedAt: z.preprocess(
    (val) => (val instanceof Date ? val.toISOString() : val),
    z.string().datetime()
  ),
  householdId: z.string().uuid(),
  fromAccountId: z.string().uuid().optional().nullable(),
  toAccountId: z.string().uuid().optional().nullable(),
  createdByUserId: z.string().uuid(),
  userId: z.string().uuid().optional().nullable(),
})

// List Transactions Input
export const listTransactionsSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  fromAccountId: z.string().uuid().optional(),
  toAccountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: transactionTypeSchema.optional(),
  q: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  page: z.number().min(1).default(1),
})

// Get Transaction By ID Input
export const getTransactionByIdSchema = z.object({
  id: z.string().uuid(),
})

// Create Transaction Input
export const createTransactionSchema = z.object({
  fromAccountId: z.string().uuid().optional().nullable(),
  toAccountId: z.string().uuid().optional().nullable(),
  type: transactionTypeSchema,
  categoryId: z.string().uuid().optional().nullable(),
  amount: z.number(),
  occurredAt: z.union([z.string(), z.date()]),
  description: z.string().optional(),
  note: z.string().optional(),
  reviewed: z.boolean().optional(),
  possibleDuplicate: z.boolean().optional(),
  duplicateOfTransactionId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
})

// Update Transaction Input
export const updateTransactionSchema = z.object({
  id: z.string().uuid(),
  fromAccountId: z.string().uuid().optional().nullable(),
  toAccountId: z.string().uuid().optional().nullable(),
  type: transactionTypeSchema.optional(),
  categoryId: z.string().uuid().optional().nullable(),
  amount: z.number().optional(),
  occurredAt: z.union([z.string(), z.date()]).optional(),
  description: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  reviewed: z.boolean().optional(),
  possibleDuplicate: z.boolean().optional(),
  duplicateOfTransactionId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
})

// Delete Transaction Input
export const deleteTransactionSchema = z.object({
  id: z.string().uuid(),
})

// Create Bulk Transactions Input
export const createBulkTransactionsSchema = z.object({
  transactions: z.array(createTransactionSchema),
})

// Create Transfer Input
export const createTransferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.number().positive(),
  occurredAt: z.union([z.string(), z.date()]),
  description: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  reviewed: z.boolean().optional(),
})

// Mark as Reviewed Input
export const markAsReviewedSchema = z.object({
  transactionIds: z.array(z.string().uuid()),
})

// Unlink Duplicate Input
export const unlinkDuplicateSchema = z.object({
  transactionId: z.string().uuid(),
})

// Type exports
export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>
export type GetTransactionByIdInput = z.infer<typeof getTransactionByIdSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>
export type CreateBulkTransactionsInput = z.infer<
  typeof createBulkTransactionsSchema
>
export type CreateTransferInput = z.infer<typeof createTransferSchema>
export type MarkAsReviewedInput = z.infer<typeof markAsReviewedSchema>
export type UnlinkDuplicateInput = z.infer<typeof unlinkDuplicateSchema>
export type Transaction = z.infer<typeof transactionSchema>
