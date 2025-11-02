import { appRouter } from '@/server/trpc/routers/_app'
import { createContext } from '@/server/trpc/context'

/**
 * Server-side caller for tRPC
 * Use this in Server Components and Server Actions
 */
export async function createCaller() {
  const ctx = await createContext()
  return appRouter.createCaller(ctx)
}
