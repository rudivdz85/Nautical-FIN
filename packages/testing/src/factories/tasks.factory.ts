import type { Task } from '@fin/core/types'
import type { CreateTaskInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestTask(overrides: Partial<Task> = {}): Task {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    taskType: 'fund_account',
    title: `Test Task ${counter}`,
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

export function createTestTaskInput(
  overrides: Partial<CreateTaskInput> = {},
): CreateTaskInput {
  return {
    taskType: 'fund_account',
    title: `Test Task ${++counter}`,
    ...overrides,
  }
}

export function resetTaskFactoryCounters(): void {
  counter = 0
}
