import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { budgetsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

type RouteContext = { params: Promise<{ id: string; incomeId: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id, incomeId } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'PATCH',
    path: `/api/budgets/${id}/incomes/${incomeId}`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'update_budget_income', budgetId: id, incomeId })

    event.incrementDbQuery()
    const income = await budgetsService.updateIncome(db, id, incomeId, user.id, body)

    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(income))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id, incomeId } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'DELETE',
    path: `/api/budgets/${id}/incomes/${incomeId}`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.addMetadata({ action: 'remove_budget_income', budgetId: id, incomeId })

    event.incrementDbQuery()
    await budgetsService.removeIncome(db, id, incomeId, user.id)

    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse({ deleted: true }))
  } catch (error) {
    return handleApiError(error, event)
  }
}
