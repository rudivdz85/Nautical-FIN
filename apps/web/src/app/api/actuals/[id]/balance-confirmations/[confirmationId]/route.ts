import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { actualsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

type RouteContext = { params: Promise<{ id: string; confirmationId: string }> }

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id, confirmationId } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'DELETE',
    path: `/api/actuals/${id}/balance-confirmations/${confirmationId}`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.addMetadata({ action: 'remove_balance_confirmation', actualId: id, confirmationId })

    event.incrementDbQuery()
    await actualsService.removeBalanceConfirmation(db, id, confirmationId, user.id)

    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse({ deleted: true }))
  } catch (error) {
    return handleApiError(error, event)
  }
}
