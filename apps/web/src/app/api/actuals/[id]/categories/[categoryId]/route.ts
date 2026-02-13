import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { actualsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

type RouteContext = { params: Promise<{ id: string; categoryId: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id, categoryId } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'PATCH',
    path: `/api/actuals/${id}/categories/${categoryId}`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'update_actual_category', actualId: id, categoryId })

    event.incrementDbQuery()
    const category = await actualsService.updateCategory(db, id, categoryId, user.id, body)

    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(category))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id, categoryId } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'DELETE',
    path: `/api/actuals/${id}/categories/${categoryId}`,
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.addMetadata({ action: 'remove_actual_category', actualId: id, categoryId })

    event.incrementDbQuery()
    await actualsService.removeCategory(db, id, categoryId, user.id)

    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse({ deleted: true }))
  } catch (error) {
    return handleApiError(error, event)
  }
}
