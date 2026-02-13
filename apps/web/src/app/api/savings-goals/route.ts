import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { savingsGoalsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function GET(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/savings-goals',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'

    event.incrementDbQuery()
    const goals = includeInactive
      ? await savingsGoalsService.listAll(db, user.id)
      : await savingsGoalsService.list(db, user.id)

    event.addMetadata({ count: goals.length, includeInactive })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(goals))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/savings-goals',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_savings_goal' })

    event.incrementDbQuery()
    const goal = await savingsGoalsService.create(db, user.id, body)

    event.addMetadata({ goalId: goal.id, goalType: goal.goalType })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(goal), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
