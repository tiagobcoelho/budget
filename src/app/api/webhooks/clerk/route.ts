import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/db'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error(
      'Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local'
    )
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  const payload = await req.text()
  JSON.parse(payload)

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  const { type } = evt

  if (type === 'user.created') {
    const {
      id: clerkId,
      email_addresses,
      first_name,
      last_name,
      image_url,
    } = evt.data

    if (!email_addresses || email_addresses.length === 0) {
      console.error('No email addresses found for user:', clerkId)
      return new Response('No email address found', { status: 400 })
    }

    try {
      const user = await db.user.create({
        data: {
          clerkId,
          email: email_addresses[0].email_address,
          firstName: first_name ?? undefined,
          lastName: last_name ?? undefined,
          imageUrl: image_url ?? undefined,
          onboarded: false,
          onboardingStep: 1,
        },
      })

      // Create default user preferences
      await db.userPreference.create({
        data: {
          userId: user.id,
          defaultCurrencyCode: 'USD',
          theme: 'DARK',
          dateFormat: 'MDY',
          budgetAlerts: true,
          transactionNotifications: true,
          monthlyReports: true,
          emailNotifications: false,
        },
      })

      // Don't create default categories or accounts - user will create them during onboarding

      console.log('User created successfully:', user.id)
    } catch (error) {
      console.error('Error creating user:', error)
      // If user already exists, that's okay (idempotency)
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        console.log('User already exists:', clerkId)
        return new Response('User already exists', { status: 200 })
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      return new Response(`Error creating user: ${errorMessage}`, {
        status: 500,
      })
    }
  }

  if (type === 'user.updated') {
    const {
      id: clerkId,
      email_addresses,
      first_name,
      last_name,
      image_url,
    } = evt.data

    if (!email_addresses || email_addresses.length === 0) {
      console.error('No email addresses found for user update:', clerkId)
      return new Response('No email address found', { status: 400 })
    }

    try {
      await db.user.update({
        where: { clerkId },
        data: {
          email: email_addresses[0].email_address,
          firstName: first_name ?? undefined,
          lastName: last_name ?? undefined,
          imageUrl: image_url ?? undefined,
          updatedAt: new Date(),
        },
      })
      console.log('User updated successfully:', clerkId)
    } catch (error) {
      console.error('Error updating user:', error)
      // If user doesn't exist, create them (edge case)
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        console.log('User not found, creating:', clerkId)
        try {
          const user = await db.user.create({
            data: {
              clerkId,
              email: email_addresses[0].email_address,
              firstName: first_name ?? undefined,
              lastName: last_name ?? undefined,
              imageUrl: image_url ?? undefined,
              onboarded: false,
              onboardingStep: 1,
            },
          })

          // Create default user preferences
          await db.userPreference.create({
            data: {
              userId: user.id,
              defaultCurrencyCode: 'USD',
              theme: 'DARK',
              dateFormat: 'MDY',
              budgetAlerts: true,
              transactionNotifications: true,
              monthlyReports: true,
              emailNotifications: false,
            },
          })

          // Don't create default categories or accounts - user will create them during onboarding
        } catch (createError) {
          console.error('Error creating user in update handler:', createError)
          const errorMessage =
            createError instanceof Error ? createError.message : 'Unknown error'
          return new Response(`Error: ${errorMessage}`, { status: 500 })
        }
      } else {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        return new Response(`Error updating user: ${errorMessage}`, {
          status: 500,
        })
      }
    }
  }

  if (type === 'user.deleted') {
    const { id: clerkId } = evt.data

    if (clerkId) {
      try {
        await db.user.delete({ where: { clerkId } })
        console.log('User deleted successfully:', clerkId)
      } catch (error) {
        console.error('Error deleting user:', error)
        // If user doesn't exist, that's okay
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code !== 'P2025'
        ) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          return new Response(`Error deleting user: ${errorMessage}`, {
            status: 500,
          })
        }
      }
    }
  }

  return new Response('', { status: 200 })
}
