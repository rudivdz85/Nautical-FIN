import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { budgetsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: `/api/budgets/${id}`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.incrementDbQuery()
    const budget = await budgetsService.getById(db, id, user.id)

    event.addMetadata({
      budgetId: budget.id,
      itemCount: budget.items.length,
      incomeCount: budget.incomes.length,
      oneOffCount: budget.plannedOneOffs.length,
    })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(budget))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'PATCH',
    path: `/api/budgets/${id}`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'update_budget' })

    event.incrementDbQuery()
    const budget = await budgetsService.update(db, id, user.id, body)

    event.addMetadata({ budgetId: budget.id })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(budget))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'DELETE',
    path: `/api/budgets/${id}`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.addMetadata({ action: 'delete_budget' })

    event.incrementDbQuery()
    await budgetsService.delete(db, id, user.id)

    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse({ deleted: true }))
  } catch (error) {
    return handleApiError(error, event)
  }
}
