import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { db } from '@/db'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.mode === 'subscription') {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )

        const user = await db.user.findUnique({
          where: { clerkId: session.metadata?.clerkId || '' },
        })

        if (user) {
          // Get user's household
          const household = await db.householdMember.findFirst({
            where: { userId: user.id },
            include: { household: true },
          })

          if (household) {
            await db.subscription.create({
              data: {
                householdId: household.household.id,
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: subscription.id,
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: new Date(
                  subscription.current_period_end * 1000
                ),
                status: subscription.status,
                plan: (session.metadata?.plan as string) || 'PRO',
              },
            })
          }
        }
      }
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice

      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        )

        await db.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            stripeCurrentPeriodEnd: new Date(
              subscription.current_period_end * 1000
            ),
            status: subscription.status,
            updatedAt: new Date(),
          },
        })
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription

      await db.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          stripeCurrentPeriodEnd: new Date(
            subscription.current_period_end * 1000
          ),
          status: subscription.status,
          updatedAt: new Date(),
        },
      })
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription

      await db.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: 'canceled', updatedAt: new Date() },
      })
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
