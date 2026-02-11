import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { budgetsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: `/api/budgets/${id}/incomes`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'add_budget_income', budgetId: id })

    event.incrementDbQuery()
    const income = await budgetsService.addIncome(db, id, user.id, body)

    event.addMetadata({ incomeId: income.id })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(income), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
