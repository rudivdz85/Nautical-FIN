import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { budgetsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function GET(_request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/budgets',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.incrementDbQuery()
    const budgets = await budgetsService.list(db, user.id)

    event.addMetadata({ count: budgets.length })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(budgets))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/budgets',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_budget' })

    event.incrementDbQuery()
    const budget = await budgetsService.create(db, user.id, body)

    event.addMetadata({ budgetId: budget.id, year: budget.year, month: budget.month })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(budget), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
