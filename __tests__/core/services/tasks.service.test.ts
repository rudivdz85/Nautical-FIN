import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tasksService } from '../../../packages/core/src/services/tasks.service'
import { tasksRepository } from '../../../packages/core/src/repositories/tasks.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { Task } from '../../../packages/core/src/types/tasks'

vi.mock('../../../packages/core/src/repositories/tasks.repository', () => ({
  tasksRepository: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof tasksService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_TASK_ID = '22222222-2222-2222-2222-222222222222'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: TEST_TASK_ID,
    userId: TEST_USER_ID,
    taskType: 'fund_account',
    title: 'Fund your account',
    description: null,
    priority: 'medium',
    status: 'pending',
    dueDate: null,
    dueTime: null,
    snoozedUntil: null,
    isRecurring: false,
    recurringSourceId: null,
    relatedEntityType: null,
    relatedEntityId: null,
    actionPath: null,
    completedAt: null,
    dismissedAt: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('tasksService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns tasks for user', async () => {
      const tasks = [makeTask()]
      vi.mocked(tasksRepository.findByUserId).mockResolvedValue(tasks)

      const result = await tasksService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual(tasks)
      expect(tasksRepository.findByUserId).toHaveBeenCalledWith(mockDb, TEST_USER_ID, undefined)
    })

    it('filters by statuses', async () => {
      vi.mocked(tasksRepository.findByUserId).mockResolvedValue([])

      await tasksService.list(mockDb, TEST_USER_ID, ['pending', 'snoozed'])

      expect(tasksRepository.findByUserId).toHaveBeenCalledWith(
        mockDb, TEST_USER_ID, ['pending', 'snoozed'],
      )
    })
  })

  describe('getById', () => {
    it('returns task when found', async () => {
      const task = makeTask()
      vi.mocked(tasksRepository.findById).mockResolvedValue(task)

      const result = await tasksService.getById(mockDb, TEST_TASK_ID, TEST_USER_ID)

      expect(result.id).toBe(TEST_TASK_ID)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(undefined)

      await expect(
        tasksService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates a task with defaults', async () => {
      const task = makeTask()
      vi.mocked(tasksRepository.create).mockResolvedValue(task)

      const result = await tasksService.create(mockDb, TEST_USER_ID, {
        taskType: 'fund_account',
        title: 'Fund your account',
      })

      expect(result).toEqual(task)
      expect(tasksRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          taskType: 'fund_account',
          title: 'Fund your account',
          priority: 'medium',
          isRecurring: false,
        }),
      )
    })

    it('creates a task with all fields', async () => {
      const task = makeTask({ priority: 'high', dueDate: '2025-03-01' })
      vi.mocked(tasksRepository.create).mockResolvedValue(task)

      await tasksService.create(mockDb, TEST_USER_ID, {
        taskType: 'balance_low',
        title: 'Low balance alert',
        description: 'Your balance is below threshold',
        priority: 'high',
        dueDate: '2025-03-01',
        dueTime: '09:00',
        isRecurring: true,
        actionPath: '/accounts/123',
        metadata: { accountId: '123' },
      })

      expect(tasksRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          taskType: 'balance_low',
          title: 'Low balance alert',
          priority: 'high',
          dueDate: '2025-03-01',
          dueTime: '09:00',
          isRecurring: true,
          actionPath: '/accounts/123',
        }),
      )
    })

    it('throws ValidationError for empty title', async () => {
      await expect(
        tasksService.create(mockDb, TEST_USER_ID, {
          taskType: 'fund_account',
          title: '',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid task type', async () => {
      await expect(
        tasksService.create(mockDb, TEST_USER_ID, {
          taskType: 'invalid_type',
          title: 'Test',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid date format', async () => {
      await expect(
        tasksService.create(mockDb, TEST_USER_ID, {
          taskType: 'fund_account',
          title: 'Test',
          dueDate: '01/03/2025',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('update', () => {
    it('updates task fields', async () => {
      const existing = makeTask()
      const updated = makeTask({ title: 'Updated title' })
      vi.mocked(tasksRepository.findById).mockResolvedValue(existing)
      vi.mocked(tasksRepository.update).mockResolvedValue(updated)

      const result = await tasksService.update(mockDb, TEST_TASK_ID, TEST_USER_ID, {
        title: 'Updated title',
      })

      expect(result.title).toBe('Updated title')
    })

    it('throws NotFoundError when task does not exist', async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(undefined)

      await expect(
        tasksService.update(mockDb, 'nonexistent', TEST_USER_ID, { title: 'Updated' }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        tasksService.update(mockDb, TEST_TASK_ID, TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })

    it('throws NotFoundError when update returns nothing', async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(makeTask())
      vi.mocked(tasksRepository.update).mockResolvedValue(undefined)

      await expect(
        tasksService.update(mockDb, TEST_TASK_ID, TEST_USER_ID, { title: 'Updated' }),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('deletes a task', async () => {
      vi.mocked(tasksRepository.delete).mockResolvedValue(true)

      await expect(
        tasksService.delete(mockDb, TEST_TASK_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when task does not exist', async () => {
      vi.mocked(tasksRepository.delete).mockResolvedValue(false)

      await expect(
        tasksService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('complete', () => {
    it('completes a pending task', async () => {
      const task = makeTask({ status: 'pending' })
      const completed = makeTask({ status: 'completed', completedAt: new Date() })
      vi.mocked(tasksRepository.findById).mockResolvedValue(task)
      vi.mocked(tasksRepository.update).mockResolvedValue(completed)

      const result = await tasksService.complete(mockDb, TEST_TASK_ID, TEST_USER_ID)

      expect(result.status).toBe('completed')
      expect(tasksRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_TASK_ID, TEST_USER_ID,
        expect.objectContaining({ status: 'completed' }),
      )
    })

    it('throws NotFoundError when task does not exist', async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(undefined)

      await expect(
        tasksService.complete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when task is already completed', async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(
        makeTask({ status: 'completed' }),
      )

      await expect(
        tasksService.complete(mockDb, TEST_TASK_ID, TEST_USER_ID),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('dismiss', () => {
    it('dismisses a pending task', async () => {
      const task = makeTask({ status: 'pending' })
      const dismissed = makeTask({ status: 'dismissed', dismissedAt: new Date() })
      vi.mocked(tasksRepository.findById).mockResolvedValue(task)
      vi.mocked(tasksRepository.update).mockResolvedValue(dismissed)

      const result = await tasksService.dismiss(mockDb, TEST_TASK_ID, TEST_USER_ID)

      expect(result.status).toBe('dismissed')
      expect(tasksRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_TASK_ID, TEST_USER_ID,
        expect.objectContaining({ status: 'dismissed' }),
      )
    })

    it('throws NotFoundError when task does not exist', async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(undefined)

      await expect(
        tasksService.dismiss(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when task is already dismissed', async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(
        makeTask({ status: 'dismissed' }),
      )

      await expect(
        tasksService.dismiss(mockDb, TEST_TASK_ID, TEST_USER_ID),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('snooze', () => {
    it('snoozes a pending task', async () => {
      const task = makeTask({ status: 'pending' })
      const snoozedUntil = new Date('2025-03-01T09:00:00Z')
      const snoozed = makeTask({ status: 'snoozed', snoozedUntil })
      vi.mocked(tasksRepository.findById).mockResolvedValue(task)
      vi.mocked(tasksRepository.update).mockResolvedValue(snoozed)

      const result = await tasksService.snooze(mockDb, TEST_TASK_ID, TEST_USER_ID, {
        snoozedUntil: '2025-03-01T09:00:00Z',
      })

      expect(result.status).toBe('snoozed')
      expect(tasksRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_TASK_ID, TEST_USER_ID,
        expect.objectContaining({ status: 'snoozed' }),
      )
    })

    it('throws NotFoundError when task does not exist', async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(undefined)

      await expect(
        tasksService.snooze(mockDb, 'nonexistent', TEST_USER_ID, {
          snoozedUntil: '2025-03-01T09:00:00Z',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when task is not pending', async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(
        makeTask({ status: 'completed' }),
      )

      await expect(
        tasksService.snooze(mockDb, TEST_TASK_ID, TEST_USER_ID, {
          snoozedUntil: '2025-03-01T09:00:00Z',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid datetime format', async () => {
      await expect(
        tasksService.snooze(mockDb, TEST_TASK_ID, TEST_USER_ID, {
          snoozedUntil: 'not-a-date',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('unsnooze', () => {
    it('unsnoozes a snoozed task', async () => {
      const task = makeTask({ status: 'snoozed', snoozedUntil: new Date() })
      const unsnoozed = makeTask({ status: 'pending', snoozedUntil: null })
      vi.mocked(tasksRepository.findById).mockResolvedValue(task)
      vi.mocked(tasksRepository.update).mockResolvedValue(unsnoozed)

      const result = await tasksService.unsnooze(mockDb, TEST_TASK_ID, TEST_USER_ID)

      expect(result.status).toBe('pending')
      expect(result.snoozedUntil).toBeNull()
      expect(tasksRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_TASK_ID, TEST_USER_ID,
        { status: 'pending', snoozedUntil: null },
      )
    })

    it('throws NotFoundError when task does not exist', async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(undefined)

      await expect(
        tasksService.unsnooze(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when task is not snoozed', async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(
        makeTask({ status: 'pending' }),
      )

      await expect(
        tasksService.unsnooze(mockDb, TEST_TASK_ID, TEST_USER_ID),
      ).rejects.toThrow(ValidationError)
    })
  })
})
