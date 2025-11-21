import { z } from 'zod'

import { AccountType } from '@prisma/client'

const accountTypeSchema = z.nativeEnum(AccountType)

// List Accounts Input
export const listAccountsSchema = z
  .object({
    type: z.nativeEnum(AccountType).optional(),
  })
  .optional()

// Get Account By ID Input
export const getAccountByIdSchema = z.object({
  id: z.string().uuid(),
})

// Create Account Input
export const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  type: accountTypeSchema,
  currencyCode: z.string().length(3).optional(),
  initialBalance: z.number().optional(),
})

// Update Account Input
export const updateAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  type: accountTypeSchema.optional(),
  currencyCode: z.string().length(3).optional(),
  initialBalance: z.number().optional(),
})

// Delete Account Input
export const deleteAccountSchema = z.object({
  id: z.string().uuid(),
})

// Get Savings Rate Input
export const getSavingsRateSchema = z.object({
  from: z.union([z.string(), z.date()]),
  to: z.union([z.string(), z.date()]),
})

// Create Bulk Accounts Input
export const createBulkAccountsSchema = z.array(
  z.object({
    name: z.string().min(1).max(255),
    type: accountTypeSchema,
    currencyCode: z.string().length(3).optional(),
  })
)

// Delete Bulk Accounts Input
export const deleteBulkAccountsSchema = z.array(z.string().uuid())

// Type exports
export type ListAccountsInput = z.infer<typeof listAccountsSchema>
export type GetAccountByIdInput = z.infer<typeof getAccountByIdSchema>
export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
export type GetSavingsRateInput = z.infer<typeof getSavingsRateSchema>
export type CreateBulkAccountsInput = z.infer<typeof createBulkAccountsSchema>
export type DeleteBulkAccountsInput = z.infer<typeof deleteBulkAccountsSchema>
