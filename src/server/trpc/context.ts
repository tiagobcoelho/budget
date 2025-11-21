import { auth } from '@clerk/nextjs/server'
import { UserService } from '@/services/user.service'
import { HouseholdService } from '@/services/household.service'
import type { User } from '@prisma/client'

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/v11/context
 */
export async function createContext() {
  const { userId: clerkId } = await auth()

  let user: User | undefined = undefined
  let householdId: string | null = null

  if (clerkId) {
    // Try to get user, or create if doesn't exist (fallback for webhook failures)
    try {
      user = await UserService.getOrCreateUserByClerkId(clerkId)
    } catch (error) {
      console.error('Error getting or creating user:', error)
      // Fallback to just getting user if creation fails
      user = (await UserService.getUserByClerkId(clerkId)) ?? undefined
    }

    // Get user's household if user exists
    if (user) {
      const household = await HouseholdService.getByUserId(user.id)
      if (household) {
        householdId = household.id
      }
    }
  }

  return {
    clerkId,
    user,
    householdId,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
