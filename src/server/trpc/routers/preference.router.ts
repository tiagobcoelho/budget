import { router, protectedProcedure } from '../trpc'
import { PreferenceService } from '@/services/preference.service'
import { updatePreferencesSchema } from '../schemas/preference.schema'

export const preferenceRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return PreferenceService.get(ctx.user!.id)
  }),

  update: protectedProcedure
    .input(updatePreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      return PreferenceService.upsert(ctx.user!.id, input)
    }),
})
