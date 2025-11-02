import { getCurrentUser } from '@/lib/auth'
import { db } from '@/db'
import { BillingClient } from './billing-client'

export default async function BillingPage() {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Loading...</div>
  }

  const subscription = await db.subscription.findFirst({
    where: { userId: user.id },
  })

  return <BillingClient subscription={subscription} />
}
