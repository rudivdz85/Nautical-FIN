import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { incomesService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: `/api/incomes/${id}/confirm`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body = (await request.json()) as { actualDate: string }
    event.addMetadata({ action: 'confirm_income', incomeId: id })

    event.incrementDbQuery()
    const income = await incomesService.confirm(db, id, user.id, body.actualDate)

    event.addMetadata({ nextExpected: income.nextExpected })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(income))
  } catch (error) {
    return handleApiError(error, event)
  }
}
