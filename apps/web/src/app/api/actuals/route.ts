import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { actualsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function GET(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/actuals',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const year = request.nextUrl.searchParams.get('year')
    const month = request.nextUrl.searchParams.get('month')

    if (year && month) {
      event.incrementDbQuery()
      const actual = await actualsService.getByMonth(
        db, user.id, parseInt(year, 10), parseInt(month, 10),
      )
      event.addMetadata({ actualId: actual.id, year, month })
      event.finalize(200, 'success')
      logger.info(event.toJSON())
      return NextResponse.json(successResponse(actual))
    }

    event.incrementDbQuery()
    const actuals = await actualsService.list(db, user.id)

    event.addMetadata({ count: actuals.length })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(actuals))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/actuals',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_actual' })

    event.incrementDbQuery()
    const actual = await actualsService.create(db, user.id, body)

    event.addMetadata({ actualId: actual.id, year: actual.year, month: actual.month })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(actual), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
