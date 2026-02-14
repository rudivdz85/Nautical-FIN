import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { netWorthSnapshotsService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export async function POST() {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/net-worth-snapshots/generate',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })
    event.addMetadata({ action: 'generate_snapshot' })

    event.incrementDbQuery()
    const snapshot = await netWorthSnapshotsService.generateSnapshot(db, user.id)

    event.addMetadata({ snapshotId: snapshot.id, snapshotDate: snapshot.snapshotDate })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(snapshot), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
