import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { usersService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function PATCH(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'PATCH',
    path: '/api/users/me/preferences',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'update_preferences' })

    event.incrementDbQuery()
    const updated = await usersService.updatePreferences(db, user.id, body)

    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(updated))
  } catch (error) {
    return handleApiError(error, event)
  }
}
