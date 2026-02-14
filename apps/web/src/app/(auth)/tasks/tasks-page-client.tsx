'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Task, TaskStatus } from '@fin/core'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  XCircle,
  Clock,
  Bell,
  ListTodo,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { formatDate } from '@/lib/format'
import { apiClient, ApiError } from '@/lib/api-client'
import { TaskForm } from './task-form'
import { TaskDeleteDialog } from './task-delete-dialog'
import { TaskSnoozeDialog } from './task-snooze-dialog'

type DialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; task: Task }
  | { type: 'delete'; task: Task }
  | { type: 'snooze'; task: Task }

type FilterStatus = 'all' | TaskStatus

interface TasksPageClientProps {
  initialTasks: Task[]
}

function formatTaskType(type: string): string {
  const labels: Record<string, string> = {
    retro_reminder: 'Retro Reminder',
    fund_account: 'Fund Account',
    balance_low: 'Balance Low',
    recurring_failed: 'Recurring Failed',
    variable_recurring_confirm: 'Confirm Recurring',
    unconfirmed_income: 'Unconfirmed Income',
    budget_threshold: 'Budget Threshold',
    unusual_spending: 'Unusual Spending',
    goal_milestone: 'Goal Milestone',
    bill_increase: 'Bill Increase',
    savings_goal_track: 'Savings Goal Track',
    uncategorized_transactions: 'Uncategorized Txns',
    surplus_action: 'Surplus Action',
    planned_expense_reminder: 'Expense Reminder',
    planned_expense_warning: 'Expense Warning',
    custom: 'Custom',
  }
  return labels[type] ?? type
}

function priorityBadgeVariant(priority: string): 'default' | 'secondary' | 'outline' {
  if (priority === 'high') return 'default'
  if (priority === 'medium') return 'secondary'
  return 'outline'
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' {
  if (status === 'pending') return 'default'
  if (status === 'snoozed') return 'secondary'
  return 'outline'
}

function formatTaskStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    completed: 'Completed',
    snoozed: 'Snoozed',
    dismissed: 'Dismissed',
  }
  return labels[status] ?? status
}

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'snoozed', label: 'Snoozed' },
  { value: 'completed', label: 'Completed' },
  { value: 'dismissed', label: 'Dismissed' },
]

export function TasksPageClient({ initialTasks }: TasksPageClientProps) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogState>({ type: 'closed' })
  const [filter, setFilter] = useState<FilterStatus>('all')

  function handleSuccess() {
    setDialog({ type: 'closed' })
    router.refresh()
  }

  const filteredTasks = filter === 'all'
    ? initialTasks
    : initialTasks.filter((t) => t.status === filter)

  const pendingCount = initialTasks.filter((t) => t.status === 'pending').length
  const highPriorityCount = initialTasks.filter(
    (t) => t.priority === 'high' && t.status === 'pending',
  ).length
  const snoozedCount = initialTasks.filter((t) => t.status === 'snoozed').length

  async function handleComplete(task: Task) {
    try {
      await apiClient.post(`/api/tasks/${task.id}/complete`, {})
      toast.success('Task completed')
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to complete task')
      }
    }
  }

  async function handleDismiss(task: Task) {
    try {
      await apiClient.post(`/api/tasks/${task.id}/dismiss`, {})
      toast.success('Task dismissed')
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to dismiss task')
      }
    }
  }

  async function handleUnsnooze(task: Task) {
    try {
      await apiClient.post(`/api/tasks/${task.id}/unsnooze`, {})
      toast.success('Task unsnoozed')
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to unsnooze task')
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Financial action items and reminders.
          </p>
        </div>
        <Button onClick={() => setDialog({ type: 'create' })}>
          <Plus className="mr-2 size-4" />
          Add Task
        </Button>
      </div>

      {initialTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <ListTodo className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No tasks yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Tasks are created automatically or you can add them manually.
          </p>
          <Button className="mt-6" onClick={() => setDialog({ type: 'create' })}>
            <Plus className="mr-2 size-4" />
            Create Your First Task
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-semibold font-numbers">{pendingCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-2xl font-semibold font-numbers text-destructive">
                  {highPriorityCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Snoozed</p>
                <p className="text-2xl font-semibold font-numbers">{snoozedCount}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-1">
            {FILTER_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={filter === option.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No tasks matching this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <span className={`font-medium ${task.status === 'completed' || task.status === 'dismissed' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </span>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {formatTaskType(task.taskType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={priorityBadgeVariant(task.priority)}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(task.status)}>
                          {formatTaskStatus(task.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(task.dueDate)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {task.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => handleComplete(task)}>
                                  <Check className="mr-2 size-4" />
                                  Complete
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDialog({ type: 'snooze', task })}
                                >
                                  <Clock className="mr-2 size-4" />
                                  Snooze
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDismiss(task)}>
                                  <XCircle className="mr-2 size-4" />
                                  Dismiss
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {task.status === 'snoozed' && (
                              <>
                                <DropdownMenuItem onClick={() => handleUnsnooze(task)}>
                                  <Bell className="mr-2 size-4" />
                                  Unsnooze
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => setDialog({ type: 'edit', task })}
                            >
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDialog({ type: 'delete', task })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog
        open={dialog.type === 'create' || dialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) setDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-lg">
          <TaskForm
            task={dialog.type === 'edit' ? dialog.task : undefined}
            onSuccess={handleSuccess}
            onCancel={() => setDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {dialog.type === 'delete' && (
        <TaskDeleteDialog
          task={dialog.task}
          onSuccess={handleSuccess}
          onCancel={() => setDialog({ type: 'closed' })}
        />
      )}

      {dialog.type === 'snooze' && (
        <TaskSnoozeDialog
          task={dialog.task}
          onSuccess={handleSuccess}
          onCancel={() => setDialog({ type: 'closed' })}
        />
      )}
    </div>
  )
}
