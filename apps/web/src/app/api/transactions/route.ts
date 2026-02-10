import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { transactionsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'
import type { TransactionFilters, TransactionType, TransactionSource } from '@fin/core/types'

const VALID_TYPES = new Set<string>(['debit', 'credit', 'transfer'])
const VALID_SOURCES = new Set<string>(['manual', 'import', 'bank_sync', 'recurring'])

function parseFilters(searchParams: URLSearchParams): TransactionFilters {
  const filters: TransactionFilters = {}

  const accountId = searchParams.get('accountId')
  if (accountId) filters.accountId = accountId

  const categoryId = searchParams.get('categoryId')
  if (categoryId) filters.categoryId = categoryId

  const type = searchParams.get('type')
  if (type && VALID_TYPES.has(type)) filters.transactionType = type as TransactionType

  const source = searchParams.get('source')
  if (source && VALID_SOURCES.has(source)) filters.source = source as TransactionSource

  const startDate = searchParams.get('startDate')
  if (startDate) filters.startDate = startDate

  const endDate = searchParams.get('endDate')
  if (endDate) filters.endDate = endDate

  const isReviewed = searchParams.get('isReviewed')
  if (isReviewed === 'true') filters.isReviewed = true
  if (isReviewed === 'false') filters.isReviewed = false

  return filters
}

export async function GET(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/transactions',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const filters = parseFilters(request.nextUrl.searchParams)
    event.addMetadata({ filters })

    event.incrementDbQuery()
    const transactions = await transactionsService.list(db, user.id, filters)

    event.addMetadata({ transactionCount: transactions.length })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(transactions))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/transactions',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_transaction' })

    event.incrementDbQuery()
    const transaction = await transactionsService.create(db, user.id, body)

    event.addMetadata({
      transactionId: transaction.id,
      transactionType: transaction.transactionType,
      accountId: transaction.accountId,
    })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(transaction), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
