import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { tasksService } from '@fin/core/services'
import { successResponse } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'
import type { TaskStatus } from '@fin/core/types'

export async function GET(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'GET',
    path: '/api/tasks',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const statusParam = request.nextUrl.searchParams.get('status')
    const statuses = statusParam
      ? (statusParam.split(',') as TaskStatus[])
      : undefined

    event.incrementDbQuery()
    const tasks = await tasksService.list(db, user.id, statuses)

    event.addMetadata({ count: tasks.length, statuses })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(tasks))
  } catch (error) {
    return handleApiError(error, event)
  }
}

export async function POST(request: NextRequest) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/tasks',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const body: unknown = await request.json()
    event.addMetadata({ action: 'create_task' })

    event.incrementDbQuery()
    const task = await tasksService.create(db, user.id, body)

    event.addMetadata({ taskId: task.id, taskType: task.taskType, priority: task.priority })
    event.finalize(201, 'success')
    logger.info(event.toJSON())

    return NextResponse.json(successResponse(task), { status: 201 })
  } catch (error) {
    return handleApiError(error, event)
  }
}
