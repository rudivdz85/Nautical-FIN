import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { recurringTransactionsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function POST() {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/recurring-transactions/auto-generate',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const today = new Date().toISOString().split('T')[0] ?? ''
    event.addMetadata({ action: 'auto_generate', asOfDate: today })

    event.incrementDbQuery()
    const generated = await recurringTransactionsService.autoGenerate(
      db, user.id, today,
    )

    event.addMetadata({ generatedCount: generated.length })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(generated))
  } catch (error) {
    return handleApiError(error, event)
  }
}
