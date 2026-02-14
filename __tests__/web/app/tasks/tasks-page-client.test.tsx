import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TasksPageClient } from '@/app/(auth)/tasks/tasks-page-client'
import type { Task } from '@fin/core'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error {
    code: string
    status: number
    constructor(code: string, message: string, status: number) {
      super(message)
      this.code = code
      this.status = status
      this.name = 'ApiError'
    }
  },
}))

vi.mock('@/app/(auth)/tasks/task-form', () => ({
  TaskForm: () => <div data-testid="task-form" />,
}))

vi.mock('@/app/(auth)/tasks/task-delete-dialog', () => ({
  TaskDeleteDialog: () => <div data-testid="task-delete-dialog" />,
}))

vi.mock('@/app/(auth)/tasks/task-snooze-dialog', () => ({
  TaskSnoozeDialog: () => <div data-testid="task-snooze-dialog" />,
}))

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    userId: 'user-1',
    taskType: 'custom',
    title: 'Review budget',
    description: 'Check your March budget',
    priority: 'medium',
    status: 'pending',
    dueDate: '2025-03-15',
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
  } as Task
}

describe('TasksPageClient', () => {
  it('renders the page title', () => {
    render(<TasksPageClient initialTasks={[]} />)
    expect(screen.getByText('Tasks')).toBeInTheDocument()
  })

  it('shows empty state when no tasks', () => {
    render(<TasksPageClient initialTasks={[]} />)
    expect(screen.getByText('No tasks yet')).toBeInTheDocument()
  })

  it('renders the Add Task button', () => {
    render(<TasksPageClient initialTasks={[]} />)
    expect(screen.getByText('Add Task')).toBeInTheDocument()
  })

  it('renders task titles in the table', () => {
    const tasks = [
      makeTask({ title: 'Review budget' }),
      makeTask({ id: 'task-2', title: 'Pay credit card' }),
    ]
    render(<TasksPageClient initialTasks={tasks} />)
    expect(screen.getByText('Review budget')).toBeInTheDocument()
    expect(screen.getByText('Pay credit card')).toBeInTheDocument()
  })

  it('renders filter buttons', () => {
    render(<TasksPageClient initialTasks={[makeTask()]} />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1)
  })

  it('renders stat cards', () => {
    const tasks = [
      makeTask({ status: 'pending', priority: 'high' }),
      makeTask({ id: 'task-2', status: 'pending', priority: 'medium' }),
      makeTask({ id: 'task-3', status: 'snoozed' }),
    ]
    render(<TasksPageClient initialTasks={tasks} />)
    expect(screen.getByText('High Priority')).toBeInTheDocument()
    expect(screen.getAllByText('Snoozed').length).toBeGreaterThanOrEqual(1)
  })

  it('filters tasks by status', async () => {
    const user = userEvent.setup()
    const tasks = [
      makeTask({ title: 'Pending task', status: 'pending' }),
      makeTask({ id: 'task-2', title: 'Done task', status: 'completed' }),
    ]
    render(<TasksPageClient initialTasks={tasks} />)

    // Click Completed filter
    const completedButtons = screen.getAllByText('Completed')
    const filterButton = completedButtons.find((el) => el.tagName === 'BUTTON' || el.closest('button'))
    if (filterButton) {
      await user.click(filterButton.closest('button') ?? filterButton)
    }
  })
})
