import { initTRPC, TRPCError } from '@trpc/server'
import { type Context } from './context'
import superjson from 'superjson'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape
  },
})

/**
 * Unprotected procedure - anyone can call
 */
export const publicProcedure = t.procedure

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.clerkId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      clerkId: ctx.clerkId,
    },
  })
})

/**
 * Rate limited procedure - requires authentication and rate limiting
 * TODO: Implement rate limiting with Upstash Redis
 */
export const rateLimitedProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    // TODO: Add Upstash rate limiting logic here
    // Example:
    // const { success } = await ratelimit.limit(ctx.user.id)
    // if (!success) throw new TRPCError({ code: 'TOO_MANY_REQUESTS' })

    return next({
      ctx,
    })
  }
)

export const router = t.router
export const middleware = t.middleware
