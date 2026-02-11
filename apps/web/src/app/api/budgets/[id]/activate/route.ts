import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { budgetsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: `/api/budgets/${id}/activate`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.addMetadata({ action: 'activate_budget', budgetId: id })

    event.incrementDbQuery()
    const budget = await budgetsService.activate(db, id, user.id)

    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(budget))
  } catch (error) {
    return handleApiError(error, event)
  }
}
