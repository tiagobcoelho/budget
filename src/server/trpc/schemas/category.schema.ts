import { z } from 'zod'
import { CategoryType } from '@prisma/client'

// Category Type Enum
export const categoryTypeSchema = z.nativeEnum(CategoryType)

// Create Category Input
export const createCategorySchema = z.object({
  name: z.string().min(1),
  type: categoryTypeSchema,
  color: z.string().min(1).max(16).optional(),
  icon: z.string().min(1).max(64).optional(),
})

// Update Category Input
export const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  type: categoryTypeSchema.optional(),
  color: z.string().min(1).max(16).optional().nullable(),
  icon: z.string().min(1).max(64).optional().nullable(),
})

// Delete Category Input
export const deleteCategorySchema = z.object({
  id: z.string().uuid(),
})

// Delete Bulk Categories Input
export const deleteBulkCategoriesSchema = z.array(z.string().uuid())

// Create Bulk Categories Input
export const createBulkCategoriesSchema = z.array(createCategorySchema)

// Type exports
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>
export type DeleteBulkCategoriesInput = z.infer<
  typeof deleteBulkCategoriesSchema
>
export type CreateBulkCategoriesInput = z.infer<
  typeof createBulkCategoriesSchema
>
