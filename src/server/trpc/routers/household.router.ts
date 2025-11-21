import { router, protectedProcedure } from '../trpc'
import { HouseholdService } from '@/services/household.service'
import { TRPCError } from '@trpc/server'
import {
  getHouseholdByIdSchema,
  updateHouseholdSchema,
  listHouseholdMembersSchema,
  inviteMemberSchema,
  removeMemberSchema,
} from '../schemas/household.schema'

export const householdRouter = router({
  /**
   * Get user's household (from their membership)
   */
  current: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    const household = await HouseholdService.getByUserId(ctx.user.id)
    if (!household) {
      // Create personal household if doesn't exist
      return HouseholdService.getOrCreatePersonalHousehold(ctx.user.id)
    }
    return household
  }),

  /**
   * Get household by ID (with membership check)
   */
  getById: protectedProcedure
    .input(getHouseholdByIdSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verify membership
      const isMember = await HouseholdService.verifyMembership(
        ctx.user.id,
        input.id
      )
      if (!isMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a member of this household',
        })
      }

      const household = await HouseholdService.getById(input.id)
      if (!household) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Household not found',
        })
      }
      return household
    }),

  /**
   * Update household name/seatLimit (OWNER only)
   */
  update: protectedProcedure
    .input(updateHouseholdSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const { id, ...data } = input

      // Verify membership and ownership
      const household = await HouseholdService.getById(id)
      if (!household) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Household not found',
        })
      }

      const membership = household.members.find(
        (m) => m.user.id === ctx.user!.id
      )
      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a member of this household',
        })
      }

      if (membership.role !== 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners can update household',
        })
      }

      // Check seat limit is not less than current member count
      if (
        data.seatLimit !== undefined &&
        data.seatLimit < household.members.length
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Seat limit cannot be less than current member count',
        })
      }

      return HouseholdService.update(id, data)
    }),

  /**
   * List household members
   */
  members: protectedProcedure
    .input(listHouseholdMembersSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verify membership
      const isMember = await HouseholdService.verifyMembership(
        ctx.user.id,
        input.householdId
      )
      if (!isMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a member of this household',
        })
      }

      return HouseholdService.getMembers(input.householdId)
    }),

  /**
   * Invite user by email to join household
   */
  invite: protectedProcedure
    .input(inviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verify membership
      const household = await HouseholdService.getById(input.householdId)
      if (!household) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Household not found',
        })
      }

      const membership = household.members.find(
        (m) => m.user.id === ctx.user!.id
      )
      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a member of this household',
        })
      }

      // Only owners can invite
      if (membership.role !== 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners can invite members',
        })
      }

      await HouseholdService.inviteByEmail(input.householdId, input.email)
      return { success: true }
    }),

  /**
   * Remove member (user can remove themselves, OWNER can remove others)
   */
  removeMember: protectedProcedure
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verify membership
      const household = await HouseholdService.getById(input.householdId)
      if (!household) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Household not found',
        })
      }

      const membership = household.members.find(
        (m) => m.user.id === ctx.user!.id
      )
      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a member of this household',
        })
      }

      // User can remove themselves, or owner can remove others
      const isRemovingSelf = input.userId === ctx.user.id
      const isOwner = membership.role === 'OWNER'

      if (!isRemovingSelf && !isOwner) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners can remove other members',
        })
      }

      await HouseholdService.removeMember(input.householdId, input.userId)
      return { success: true }
    }),
})
