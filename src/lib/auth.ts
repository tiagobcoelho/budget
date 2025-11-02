import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/db'

export async function getCurrentUser() {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  // Try to get user from database
  let user = await db.user.findUnique({
    where: { clerkId: userId },
  })

  // If user doesn't exist in DB, create them (fallback for when webhook doesn't fire)
  if (!user) {
    const clerkUser = await currentUser()
    if (clerkUser) {
      user = await db.user.create({
        data: {
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          firstName: clerkUser.firstName ?? undefined,
          lastName: clerkUser.lastName ?? undefined,
          imageUrl: clerkUser.imageUrl ?? undefined,
        },
      })
    }
  }

  return user
}

export async function requireAuth() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  return userId
}
