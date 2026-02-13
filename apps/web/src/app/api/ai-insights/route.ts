import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { aiInsightsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function GET(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/ai-insights',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true'

    event.incrementDbQuery()
    const insights = unreadOnly
      ? await aiInsightsService.listUnread(db, user.id)
      : await aiInsightsService.list(db, user.id)

    event.addMetadata({ count: insights.length, unreadOnly })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(insights))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/ai-insights',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_ai_insight' })

    event.incrementDbQuery()
    const insight = await aiInsightsService.create(db, user.id, body)

    event.addMetadata({ insightId: insight.id, insightType: insight.insightType })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(insight), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
