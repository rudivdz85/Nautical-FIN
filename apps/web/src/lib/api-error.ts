import { NextResponse } from 'next/server'
import { AppError } from '@fin/core/errors'
import { errorResponse } from '@fin/core'
import { logger, type WideEvent } from '@fin/logger'

export function handleApiError(error: unknown, event: WideEvent): NextResponse {
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
