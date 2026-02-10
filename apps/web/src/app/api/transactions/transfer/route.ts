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
    path: '/api/transactions/transfer',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_transfer' })

    event.incrementDbQuery()
    const result = await transactionsService.createTransfer(db, user.id, body)

    event.addMetadata({
      debitTransactionId: result.debit.id,
      creditTransactionId: result.credit.id,
      transferPairId: result.debit.transferPairId,
    })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(result), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
