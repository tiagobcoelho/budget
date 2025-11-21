import { z } from 'zod'

// List Budgets Input
export const listBudgetsSchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .optional()

// Budget Definitions Input
export const budgetDefinitionsSchema = z
  .object({ includeArchived: z.boolean().optional() })
  .optional()

// Archive/Reactivate Budget Definition Input
export const budgetDefinitionIdSchema = z.object({
  id: z.string().uuid(),
})

// Get Budget By ID Input
export const getBudgetByIdSchema = z.object({
  id: z.string().uuid(),
})

// Create Budget Input
export const createBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).optional(),
  startDate: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]),
  amount: z.number().positive(),
})

// Update Budget Input
export const updateBudgetSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  startDate: z.union([z.string(), z.date()]).optional(),
  endDate: z.union([z.string(), z.date()]).optional(),
  amount: z.number().positive().optional(),
})

export const updateBudgetDefinitionSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1).optional(),
    amount: z.number().positive().optional(),
  })
  .refine((data) => data.name !== undefined || data.amount !== undefined, {
    message: 'Must provide at least one field to update',
    path: ['amount'],
  })

// Delete Budget Input
export const deleteBudgetSchema = z.object({
  id: z.string().uuid(),
})

// Create Budgets Bulk Input
export const createBudgetsBulkSchema = z.object({
  items: z.array(createBudgetSchema).min(1),
})

// Type exports
export type ListBudgetsInput = z.infer<typeof listBudgetsSchema>
export type BudgetDefinitionsInput = z.infer<typeof budgetDefinitionsSchema>
export type BudgetDefinitionIdInput = z.infer<typeof budgetDefinitionIdSchema>
export type GetBudgetByIdInput = z.infer<typeof getBudgetByIdSchema>
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>
export type DeleteBudgetInput = z.infer<typeof deleteBudgetSchema>
export type CreateBudgetsBulkInput = z.infer<typeof createBudgetsBulkSchema>
export type UpdateBudgetDefinitionInput = z.infer<
  typeof updateBudgetDefinitionSchema
>
