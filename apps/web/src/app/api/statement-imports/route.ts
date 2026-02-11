import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { statementImportsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function GET(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/statement-imports',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const accountId = request.nextUrl.searchParams.get('accountId')

    event.incrementDbQuery()
    const imports = accountId
      ? await statementImportsService.listByAccount(db, accountId, user.id)
      : await statementImportsService.list(db, user.id)

    event.addMetadata({ count: imports.length, accountId })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(imports))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/statement-imports',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_import' })

    event.incrementDbQuery()
    const imp = await statementImportsService.create(db, user.id, body)

    event.addMetadata({ importId: imp.id, accountId: imp.accountId })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(imp), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
