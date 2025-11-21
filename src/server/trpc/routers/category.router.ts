import { router, householdProcedure } from '../trpc'
import { CategoryService } from '@/services/category.service'
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  deleteBulkCategoriesSchema,
  createBulkCategoriesSchema,
} from '../schemas/category.schema'

export const categoryRouter = router({
  list: householdProcedure.query(async ({ ctx }) => {
    return CategoryService.list(ctx.householdId!)
  }),

  listWithMetrics: householdProcedure.query(async ({ ctx }) => {
    return CategoryService.listWithMetrics(ctx.householdId!)
  }),

  create: householdProcedure
    .input(createCategorySchema)
    .mutation(async ({ ctx, input }) => {
      return CategoryService.create(ctx.householdId!, input)
    }),

  update: householdProcedure
    .input(updateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return CategoryService.update(ctx.householdId!, id, data)
    }),

  delete: householdProcedure
    .input(deleteCategorySchema)
    .mutation(async ({ ctx, input }) => {
      return CategoryService.remove(ctx.householdId!, input.id)
    }),

  deleteBulk: householdProcedure
    .input(deleteBulkCategoriesSchema)
    .mutation(async ({ ctx, input }) => {
      return CategoryService.removeBulk(ctx.householdId!, input)
    }),

  createBulk: householdProcedure
    .input(createBulkCategoriesSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) {
        throw new Error('At least one category is required')
      }
      const categories = await Promise.all(
        input.map((category) =>
          CategoryService.create(ctx.householdId!, {
            name: category.name,
            type: category.type,
            color: category.color ?? null,
            icon: category.icon ?? null,
          })
        )
      )
      return categories
    }),
})
