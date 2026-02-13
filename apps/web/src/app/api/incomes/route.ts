import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { incomesService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function GET(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/incomes',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'

    event.incrementDbQuery()
    const incomes = includeInactive
      ? await incomesService.listAll(db, user.id)
      : await incomesService.list(db, user.id)

    event.addMetadata({ count: incomes.length, includeInactive })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(incomes))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/incomes',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_income' })

    event.incrementDbQuery()
    const income = await incomesService.create(db, user.id, body)

    event.addMetadata({
      incomeId: income.id,
      frequency: income.frequency,
      isPrimarySalary: income.isPrimarySalary,
    })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(income), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
