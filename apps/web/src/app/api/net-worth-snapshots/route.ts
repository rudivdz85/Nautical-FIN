import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { netWorthSnapshotsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function GET(_request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/net-worth-snapshots',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    event.incrementDbQuery()
    const snapshots = await netWorthSnapshotsService.list(db, user.id)

    event.addMetadata({ count: snapshots.length })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(snapshots))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/net-worth-snapshots',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_net_worth_snapshot' })

    event.incrementDbQuery()
    const snapshot = await netWorthSnapshotsService.create(db, user.id, body)

    event.addMetadata({ snapshotId: snapshot.id, snapshotDate: snapshot.snapshotDate })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(snapshot), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
