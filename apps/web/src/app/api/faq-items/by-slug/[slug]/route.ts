import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleApiError } from '@/lib/api-error'
import { faqItemsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: `/api/faq-items/by-slug/${slug}`,
  })

  try {
    event.incrementDbQuery()
    const item = await faqItemsService.getBySlug(db, slug)

    event.addMetadata({ faqItemId: item.id, slug: item.slug })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(item))
  } catch (error) {
    return handleApiError(error, event)
  }
}
