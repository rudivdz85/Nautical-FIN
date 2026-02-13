import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { actualsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

type RouteContext = { params: Promise<{ id: string; confirmationId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { id, confirmationId } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: `/api/actuals/${id}/balance-confirmations/${confirmationId}/confirm`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'confirm_balance', actualId: id, confirmationId })

    event.incrementDbQuery()
    const confirmation = await actualsService.confirmBalance(
      db, id, confirmationId, user.id, body,
    )

    event.addMetadata({ isConfirmed: confirmation.isConfirmed, difference: confirmation.difference })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(confirmation))
  } catch (error) {
    return handleApiError(error, event)
  }
}
