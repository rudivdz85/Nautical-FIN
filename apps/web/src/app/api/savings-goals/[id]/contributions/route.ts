import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { savingsGoalsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: `/api/savings-goals/${id}/contributions`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.incrementDbQuery()
    const contributions = await savingsGoalsService.listContributions(db, id, user.id)

    event.addMetadata({ goalId: id, count: contributions.length })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(contributions))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: `/api/savings-goals/${id}/contributions`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'add_contribution', goalId: id })

    event.incrementDbQuery()
    const contribution = await savingsGoalsService.addContribution(db, id, user.id, body)

    event.addMetadata({ contributionId: contribution.id, amount: contribution.amount })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(contribution), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
