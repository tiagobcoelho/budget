import { router } from '../trpc'
import { conversationRouter } from './conversation.router'
import { userRouter } from './user.router'
import { categoryRouter } from './category.router'
import { transactionRouter } from './transaction.router'
import { budgetRouter } from './budget.router'
import { preferenceRouter } from './preference.router'
import { accountRouter } from './account.router'
import { reportRouter } from './report.router'
import { householdRouter } from './household.router'

export const appRouter = router({
  conversation: conversationRouter,
  user: userRouter,
  category: categoryRouter,
  transaction: transactionRouter,
  budget: budgetRouter,
  preference: preferenceRouter,
  account: accountRouter,
  report: reportRouter,
  household: householdRouter,
})

export type AppRouter = typeof appRouter
