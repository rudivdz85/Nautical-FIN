import { type NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { dailyTrackerService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/daily-tracker/generate',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body = (await request.json()) as { startDate: string; endDate: string }
    event.addMetadata({ action: 'generate_tracker', startDate: body.startDate, endDate: body.endDate })

    event.incrementDbQuery()
    const entries = await dailyTrackerService.generateRange(
      db,
      user.id,
      body.startDate,
      body.endDate,
    )

    event.addMetadata({ entriesGenerated: entries.length })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(entries), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
