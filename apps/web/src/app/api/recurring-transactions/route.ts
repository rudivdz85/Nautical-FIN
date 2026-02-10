import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { recurringTransactionsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function GET(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/recurring-transactions',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'

    event.incrementDbQuery()
    const recurring = includeInactive
      ? await recurringTransactionsService.listAll(db, user.id)
      : await recurringTransactionsService.list(db, user.id)

    event.addMetadata({ count: recurring.length, includeInactive })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(recurring))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/recurring-transactions',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_recurring' })

    event.incrementDbQuery()
    const recurring = await recurringTransactionsService.create(db, user.id, body)

    event.addMetadata({
      recurringId: recurring.id,
      frequency: recurring.frequency,
      amountType: recurring.amountType,
    })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(recurring), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
