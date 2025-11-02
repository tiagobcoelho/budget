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

    await db.user.create({
      data: {
        clerkId,
        email: email_addresses[0].email_address,
        firstName: first_name ?? undefined,
        lastName: last_name ?? undefined,
        imageUrl: image_url ?? undefined,
      },
    })
  }

  if (type === 'user.updated') {
    const {
      id: clerkId,
      email_addresses,
      first_name,
      last_name,
      image_url,
    } = evt.data

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
  }

  if (type === 'user.deleted') {
    const { id: clerkId } = evt.data

    if (clerkId) {
      await db.user.delete({ where: { clerkId } })
    }
  }

  return new Response('', { status: 200 })
}
