import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { chatMessagesService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function GET(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/chat-messages',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const limitParam = request.nextUrl.searchParams.get('limit')
    const offsetParam = request.nextUrl.searchParams.get('offset')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined

    event.incrementDbQuery()
    const messages = await chatMessagesService.list(db, user.id, limit, offset)

    event.addMetadata({ count: messages.length })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(messages))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/chat-messages',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_chat_message' })

    event.incrementDbQuery()
    const message = await chatMessagesService.create(db, user.id, body)

    event.addMetadata({ messageId: message.id, role: message.role })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(message), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function DELETE(_request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'DELETE',
    path: '/api/chat-messages',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.addMetadata({ action: 'clear_chat_history' })

    event.incrementDbQuery()
    const count = await chatMessagesService.clearHistory(db, user.id)

    event.addMetadata({ deletedCount: count })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse({ deleted: count }))
  } catch (error) {
    return handleApiError(error, event)
  }
}
