import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { faqItemsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function GET(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/faq-items',
  })

  try {
    const category = request.nextUrl.searchParams.get('category')

    event.incrementDbQuery()
    const items = category
      ? await faqItemsService.listByCategory(db, category)
      : await faqItemsService.list(db)

    event.addMetadata({ count: items.length, category })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(items))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/faq-items',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_faq_item' })

    event.incrementDbQuery()
    const item = await faqItemsService.create(db, body)

    event.addMetadata({ faqItemId: item.id, slug: item.slug })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(item), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
