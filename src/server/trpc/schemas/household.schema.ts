import { z } from 'zod'

// Get Household By ID Input
export const getHouseholdByIdSchema = z.object({
  id: z.string().uuid(),
})

// Update Household Input
export const updateHouseholdSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  seatLimit: z.number().min(1).max(10).optional(),
})

// List Household Members Input
export const listHouseholdMembersSchema = z.object({
  householdId: z.string().uuid(),
})

// Invite Member Input
export const inviteMemberSchema = z.object({
  householdId: z.string().uuid(),
  email: z.string().email(),
})

// Remove Member Input
export const removeMemberSchema = z.object({
  householdId: z.string().uuid(),
  userId: z.string().uuid(),
})

// Type exports
export type GetHouseholdByIdInput = z.infer<typeof getHouseholdByIdSchema>
export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>
export type ListHouseholdMembersInput = z.infer<
  typeof listHouseholdMembersSchema
>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>
