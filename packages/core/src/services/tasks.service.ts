import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { tasksRepository } from '../repositories/tasks.repository'
import {
  createTaskSchema,
  updateTaskSchema,
  snoozeTaskSchema,
} from '../validation/tasks'
import type { Task, TaskStatus } from '../types/tasks'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const tasksService = {
  async list(
    db: Database,
    userId: string,
    statuses?: TaskStatus[],
  ): Promise<Task[]> {
    return tasksRepository.findByUserId(db, userId, statuses)
  },

  async getById(db: Database, id: string, userId: string): Promise<Task> {
    const task = await tasksRepository.findById(db, id, userId)
    if (!task) {
      throw new NotFoundError('Task', id)
    }
    return task
  },

  async create(db: Database, userId: string, input: unknown): Promise<Task> {
    const parsed = createTaskSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid task data', parsed.error.issues)
    }

    const data = parsed.data

    return tasksRepository.create(db, {
      userId,
      taskType: data.taskType,
      title: data.title,
      description: data.description,
      priority: data.priority ?? 'medium',
      dueDate: data.dueDate,
      dueTime: data.dueTime,
      isRecurring: data.isRecurring ?? false,
      recurringSourceId: data.recurringSourceId,
      relatedEntityType: data.relatedEntityType,
      relatedEntityId: data.relatedEntityId,
      actionPath: data.actionPath,
      metadata: data.metadata,
    })
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    input: unknown,
  ): Promise<Task> {
    const parsed = updateTaskSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid task data', parsed.error.issues)
    }

    const existing = await tasksRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('Task', id)
    }

    const updated = await tasksRepository.update(db, id, userId, parsed.data)
    if (!updated) {
      throw new NotFoundError('Task', id)
    }

    return updated
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const deleted = await tasksRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('Task', id)
    }
  },

  async complete(db: Database, id: string, userId: string): Promise<Task> {
    const task = await tasksRepository.findById(db, id, userId)
    if (!task) {
      throw new NotFoundError('Task', id)
    }

    if (task.status === 'completed') {
      throw new ValidationError('Task is already completed', {
        status: ['Task has already been completed'],
      })
    }

    const updated = await tasksRepository.update(db, id, userId, {
      status: 'completed',
      completedAt: new Date(),
    })

    return updated!
  },

  async dismiss(db: Database, id: string, userId: string): Promise<Task> {
    const task = await tasksRepository.findById(db, id, userId)
    if (!task) {
      throw new NotFoundError('Task', id)
    }

    if (task.status === 'dismissed') {
      throw new ValidationError('Task is already dismissed', {
        status: ['Task has already been dismissed'],
      })
    }

    const updated = await tasksRepository.update(db, id, userId, {
      status: 'dismissed',
      dismissedAt: new Date(),
    })

    return updated!
  },

  async snooze(
    db: Database,
    id: string,
    userId: string,
    input: unknown,
  ): Promise<Task> {
    const parsed = snoozeTaskSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid snooze data', parsed.error.issues)
    }

    const task = await tasksRepository.findById(db, id, userId)
    if (!task) {
      throw new NotFoundError('Task', id)
    }

    if (task.status !== 'pending') {
      throw new ValidationError('Can only snooze pending tasks', {
        status: [`Current status is '${task.status}', expected 'pending'`],
      })
    }

    const updated = await tasksRepository.update(db, id, userId, {
      status: 'snoozed',
      snoozedUntil: new Date(parsed.data.snoozedUntil),
    })

    return updated!
  },

  async unsnooze(db: Database, id: string, userId: string): Promise<Task> {
    const task = await tasksRepository.findById(db, id, userId)
    if (!task) {
      throw new NotFoundError('Task', id)
    }

    if (task.status !== 'snoozed') {
      throw new ValidationError('Can only unsnooze snoozed tasks', {
        status: [`Current status is '${task.status}', expected 'snoozed'`],
      })
    }

    const updated = await tasksRepository.update(db, id, userId, {
      status: 'pending',
      snoozedUntil: null,
    })

    return updated!
  },
}

function buildValidationError(
  message: string,
  issues: { path: (string | number)[]; message: string }[],
): ValidationError {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of issues) {
    const path = issue.path.join('.')
    if (!fieldErrors[path]) {
      fieldErrors[path] = []
    }
    fieldErrors[path].push(issue.message)
  }
  return new ValidationError(message, fieldErrors)
}
