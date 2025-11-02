import { router, protectedProcedure } from '../trpc'

export const userRouter = router({
  /**
   * Get current user's profile
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user
  }),
})
