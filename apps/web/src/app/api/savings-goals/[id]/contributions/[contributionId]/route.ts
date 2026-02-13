import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { savingsGoalsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

type RouteContext = { params: Promise<{ id: string; contributionId: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id, contributionId } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'PATCH',
    path: `/api/savings-goals/${id}/contributions/${contributionId}`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'update_contribution', goalId: id, contributionId })

    event.incrementDbQuery()
    const contribution = await savingsGoalsService.updateContribution(
      db, id, contributionId, user.id, body,
    )

    event.addMetadata({ updatedAmount: contribution.amount })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(contribution))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id, contributionId } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'DELETE',
    path: `/api/savings-goals/${id}/contributions/${contributionId}`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.addMetadata({ action: 'remove_contribution', goalId: id, contributionId })

    event.incrementDbQuery()
    await savingsGoalsService.removeContribution(db, id, contributionId, user.id)

    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse({ deleted: true }))
  } catch (error) {
    return handleApiError(error, event)
  }
}
