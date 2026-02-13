import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { debtsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

type RouteContext = { params: Promise<{ id: string; paymentId: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id, paymentId } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'PATCH',
    path: `/api/debts/${id}/payments/${paymentId}`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'update_debt_payment', debtId: id, paymentId })

    event.incrementDbQuery()
    const payment = await debtsService.updatePayment(db, id, paymentId, user.id, body)

    event.addMetadata({ updatedAmount: payment.amount })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(payment))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id, paymentId } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'DELETE',
    path: `/api/debts/${id}/payments/${paymentId}`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.addMetadata({ action: 'remove_debt_payment', debtId: id, paymentId })

    event.incrementDbQuery()
    await debtsService.removePayment(db, id, paymentId, user.id)

    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse({ deleted: true }))
  } catch (error) {
    return handleApiError(error, event)
  }
}
