import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { categoriesService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'
import type { CategoryType } from '@fin/core/types'

const VALID_TYPES = new Set<string>(['income', 'expense'])

export async function GET(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/categories',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const typeParam = request.nextUrl.searchParams.get('type')
    const type = typeParam && VALID_TYPES.has(typeParam) ? (typeParam as CategoryType) : undefined

    event.incrementDbQuery()
    const categories = await categoriesService.list(db, user.id, type)

    event.addMetadata({ categoryCount: categories.length, filterType: type ?? 'all' })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(categories))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/categories',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_category' })

    event.incrementDbQuery()
    const category = await categoriesService.create(db, user.id, body)

    event.addMetadata({ categoryId: category.id, categoryType: category.categoryType })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(category), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
