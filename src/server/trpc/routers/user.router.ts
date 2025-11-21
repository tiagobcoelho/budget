import { router, protectedProcedure } from '../trpc'
import { UserService } from '@/services/user.service'
import { db } from '@/db'
import {
  updateOnboardingStepSchema,
  updateProfileSchema,
} from '../schemas/user.schema'

export const userRouter = router({
  /**
   * Get current user's profile
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user
  }),

  /**
   * Get current onboarding step
   */
  getOnboardingStep: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error('User not found')
    }
    return {
      step: ctx.user.onboardingStep ?? 1,
      onboarded: ctx.user.onboarded,
    }
  }),

  /**
   * Update onboarding step
   */
  updateOnboardingStep: protectedProcedure
    .input(updateOnboardingStepSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found')
      }
      return UserService.updateOnboardingStep(ctx.user.id, input.step)
    }),

  /**
   * Complete onboarding
   */
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error('User not found')
    }
    return UserService.completeOnboarding(ctx.user.id)
  }),

  /**
   * Update user profile (for onboarding step 1)
   */
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found')
      }
      // Update user fields and advance to step 2
      return db.user.update({
        where: { id: ctx.user.id },
        data: {
          firstName: input.firstName ?? ctx.user.firstName,
          lastName: input.lastName ?? ctx.user.lastName,
          onboardingStep: 2,
        },
      })
    }),
})
