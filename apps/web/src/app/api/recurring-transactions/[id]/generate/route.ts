import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { recurringTransactionsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: `/api/recurring-transactions/${id}/generate`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body = (await request.json()) as { amount: string }
    event.addMetadata({ action: 'generate_instance', recurringId: id })

    event.incrementDbQuery()
    const transaction = await recurringTransactionsService.generateInstance(
      db, id, user.id, body.amount,
    )

    event.addMetadata({ transactionId: transaction.id })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(transaction), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
