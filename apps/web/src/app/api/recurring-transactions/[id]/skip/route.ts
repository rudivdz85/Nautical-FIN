import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { recurringTransactionsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: `/api/recurring-transactions/${id}/skip`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.addMetadata({ action: 'skip_occurrence', recurringId: id })

    event.incrementDbQuery()
    const recurring = await recurringTransactionsService.skip(db, id, user.id)

    event.addMetadata({ nextOccurrence: recurring.nextOccurrence })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(recurring))
  } catch (error) {
    return handleApiError(error, event)
  }
}
