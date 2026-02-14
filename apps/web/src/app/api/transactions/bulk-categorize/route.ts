import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { transactionsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/transactions/bulk-categorize',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body = await request.json()
    event.addMetadata({ action: 'bulk_categorize', count: body.transactionIds?.length })

    event.incrementDbQuery()
    const result = await transactionsService.bulkCategorize(db, user.id, body)

    event.addMetadata({ updatedCount: result.updated })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(result))
  } catch (error) {
    return handleApiError(error, event)
  }
}
