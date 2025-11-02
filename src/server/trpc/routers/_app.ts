import { router } from '../trpc'
import { conversationRouter } from './conversation.router'
import { userRouter } from './user.router'

export const appRouter = router({
  conversation: conversationRouter,
  user: userRouter,
})

export type AppRouter = typeof appRouter
