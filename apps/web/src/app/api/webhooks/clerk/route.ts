import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { db } from '@/lib/db'
import { usersService } from '@fin/core/services'
import { AppError } from '@fin/core/errors'
import { logger, WideEvent } from '@fin/logger'

interface ClerkEmailAddress {
  email_address: string
  id: string
}

interface ClerkUserEventData {
  id: string
  email_addresses: ClerkEmailAddress[]
  primary_email_address_id: string
  first_name: string | null
  last_name: string | null
}

interface ClerkWebhookEvent {
  type: string
  data: ClerkUserEventData
}

function getDisplayName(firstName: string | null, lastName: string | null): string | undefined {
  const parts = [firstName, lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : undefined
}

function getPrimaryEmail(data: ClerkUserEventData): string {
  const primary = data.email_addresses.find((e) => e.id === data.primary_email_address_id)
  const fallback = data.email_addresses[0]
  return primary?.email_address ?? fallback?.email_address ?? ''
}

export async function POST(request: Request) {
  const event = new WideEvent('webhook').setRequest({
    method: 'POST',
    path: '/api/webhooks/clerk',
  })

  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new Error('CLERK_WEBHOOK_SECRET is not set')
    }

    const body = await request.text()
    const svixId = request.headers.get('svix-id')
    const svixTimestamp = request.headers.get('svix-timestamp')
    const svixSignature = request.headers.get('svix-signature')

    if (!svixId || !svixTimestamp || !svixSignature) {
      event.finalize(400, 'error')
      event.setError({ code: 'MISSING_HEADERS', message: 'Missing svix headers' })
      logger.warn(event.toJSON())
      return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
    }

    const wh = new Webhook(webhookSecret)
    const payload = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent

    const { type, data } = payload
    event.addMetadata({ webhookType: type, clerkUserId: data.id })

    switch (type) {
      case 'user.created': {
        const email = getPrimaryEmail(data)
        const displayName = getDisplayName(data.first_name, data.last_name)

        event.incrementDbQuery()
        const user = await usersService.createFromWebhook(db, data.id, email, displayName)
        event.addMetadata({ userId: user.id, action: 'user_created' })
        break
      }

      case 'user.updated': {
        const email = getPrimaryEmail(data)
        const displayName = getDisplayName(data.first_name, data.last_name)

        event.incrementDbQuery()
        await usersService.updateFromWebhook(db, data.id, email, displayName)
        event.addMetadata({ action: 'user_updated' })
        break
      }

      case 'user.deleted': {
        event.incrementDbQuery()
        await usersService.deleteByClerkId(db, data.id)
        event.addMetadata({ action: 'user_deleted' })
        break
      }

      default: {
        event.addMetadata({ action: 'ignored', reason: `Unhandled event type: ${type}` })
      }
    }

    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json({ received: true })
  } catch (error) {
    if (error instanceof AppError) {
      event.setError({ code: error.code, message: error.message })
      event.finalize(error.statusCode, 'error')
      logger.warn(event.toJSON())
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }

    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    event.setError({
      code: 'WEBHOOK_ERROR',
      message,
      stack: error instanceof Error ? error.stack : undefined,
    })
    event.finalize(500, 'error')
    logger.error(event.toJSON())

    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
