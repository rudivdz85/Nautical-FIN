import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { debtsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function GET(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/debts',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'

    event.incrementDbQuery()
    const debts = includeInactive
      ? await debtsService.listAll(db, user.id)
      : await debtsService.list(db, user.id)

    event.addMetadata({ count: debts.length, includeInactive })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(debts))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/debts',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_debt' })

    event.incrementDbQuery()
    const debt = await debtsService.create(db, user.id, body)

    event.addMetadata({ debtId: debt.id, debtType: debt.debtType })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(debt), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
