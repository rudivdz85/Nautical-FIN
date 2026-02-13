import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { actualsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

type RouteContext = { params: Promise<{ id: string; allocationId: string }> }

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id, allocationId } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: `/api/actuals/${id}/surplus-allocations/${allocationId}/action`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.addMetadata({ action: 'action_surplus_allocation', actualId: id, allocationId })

    event.incrementDbQuery()
    const allocation = await actualsService.actionSurplusAllocation(
      db, id, allocationId, user.id,
    )

    event.addMetadata({ isActioned: allocation.isActioned })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(allocation))
  } catch (error) {
    return handleApiError(error, event)
  }
}
