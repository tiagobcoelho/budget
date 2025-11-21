import { z } from 'zod'

// Update Onboarding Step Input
export const updateOnboardingStepSchema = z.object({
  step: z.number().min(1).max(5),
})

// Update Profile Input
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
})

// Type exports
export type UpdateOnboardingStepInput = z.infer<
  typeof updateOnboardingStepSchema
>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
