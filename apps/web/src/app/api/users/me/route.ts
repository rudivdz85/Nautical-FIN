import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { usersService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function GET(_request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/users/me',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.incrementDbQuery()
    const fullUser = await usersService.getById(db, user.id)

    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(fullUser))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function PATCH(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'PATCH',
    path: '/api/users/me',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body = (await request.json()) as { isSalaried?: boolean }
    event.addMetadata({ action: 'update_profile' })

    event.incrementDbQuery()
    const { usersRepository } = await import('@fin/core/repositories')
    const updated = await usersRepository.update(db, user.id, {
      isSalaried: body.isSalaried,
    })

    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(updated))
  } catch (error) {
    return handleApiError(error, event)
  }
}
