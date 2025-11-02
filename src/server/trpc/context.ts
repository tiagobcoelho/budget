import { auth } from '@clerk/nextjs/server'
import { UserService } from '@/services/user.service'
import type { User } from '@prisma/client'

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/v11/context
 */
export async function createContext() {
  const { userId: clerkId } = await auth()

  let user: User | undefined = undefined

  if (clerkId) {
    user = await UserService.getUserByClerkId(clerkId)
  }

  return {
    clerkId,
    user,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
