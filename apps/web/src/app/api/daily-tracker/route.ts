import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { dailyTrackerService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function GET(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/daily-tracker',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const startDate = request.nextUrl.searchParams.get('startDate')
    const endDate = request.nextUrl.searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: { message: 'startDate and endDate query params are required' } },
        { status: 400 },
      )
    }

    event.incrementDbQuery()
    const entries = await dailyTrackerService.getRange(db, user.id, startDate, endDate)

    event.addMetadata({ count: entries.length, startDate, endDate })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(entries))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/daily-tracker',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_daily_tracker_entry' })

    event.incrementDbQuery()
    const entry = await dailyTrackerService.create(db, user.id, body)

    event.addMetadata({ entryId: entry.id, date: entry.date })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(entry), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
