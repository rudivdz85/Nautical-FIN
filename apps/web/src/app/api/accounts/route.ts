import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { accountsService } from '@fin/core/services'
import { AppError } from '@fin/core/errors'
import { successResponse, errorResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function GET(_request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/accounts',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.incrementDbQuery()
    const accounts = await accountsService.list(db, user.id)

    event.addMetadata({ accountCount: accounts.length })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(accounts))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/accounts',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_account' })

    event.incrementDbQuery()
    const account = await accountsService.create(db, user.id, body)

    event.addMetadata({ accountId: account.id, accountType: account.accountType })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(account), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}

function handleApiError(error: unknown, event: WideEvent): NextResponse {
  if (error instanceof AppError) {
    event.setError({ code: error.code, message: error.message })
    event.finalize(error.statusCode, 'error')
    logger.warn(event.toJSON())

    return NextResponse.json(error.toJSON(), { status: error.statusCode })
  }

  const message = error instanceof Error ? error.message : 'Internal server error'
  event.setError({
    code: 'INTERNAL_ERROR',
    message,
    stack: error instanceof Error ? error.stack : undefined,
  })
  event.finalize(500, 'error')
  logger.error(event.toJSON())

  return NextResponse.json(errorResponse('INTERNAL_ERROR', 'Internal server error'), {
    status: 500,
  })
}
