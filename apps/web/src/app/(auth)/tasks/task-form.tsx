'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { createTaskSchema, type Task } from '@fin/core'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { apiClient, ApiError } from '@/lib/api-client'

type FormValues = z.input<typeof createTaskSchema>

interface TaskFormProps {
  task?: Task
  onSuccess: () => void
  onCancel: () => void
}

const taskTypeOptions = [
  { value: 'retro_reminder', label: 'Retro Reminder' },
  { value: 'fund_account', label: 'Fund Account' },
  { value: 'balance_low', label: 'Balance Low' },
  { value: 'recurring_failed', label: 'Recurring Failed' },
  { value: 'variable_recurring_confirm', label: 'Confirm Recurring' },
  { value: 'unconfirmed_income', label: 'Unconfirmed Income' },
  { value: 'budget_threshold', label: 'Budget Threshold' },
  { value: 'unusual_spending', label: 'Unusual Spending' },
  { value: 'goal_milestone', label: 'Goal Milestone' },
  { value: 'bill_increase', label: 'Bill Increase' },
  { value: 'savings_goal_track', label: 'Savings Goal Track' },
  { value: 'uncategorized_transactions', label: 'Uncategorized Transactions' },
  { value: 'surplus_action', label: 'Surplus Action' },
  { value: 'planned_expense_reminder', label: 'Planned Expense Reminder' },
  { value: 'planned_expense_warning', label: 'Planned Expense Warning' },
  { value: 'custom', label: 'Custom' },
]

const priorityOptions = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
  const isEditing = !!task

  const form = useForm<FormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: task
      ? {
          taskType: task.taskType,
          title: task.title,
          description: task.description ?? undefined,
          priority: task.priority,
          dueDate: task.dueDate ?? undefined,
          dueTime: task.dueTime ?? undefined,
        }
      : {
          taskType: 'fund_account' as const,
          title: '',
          description: '',
          priority: 'medium' as const,
          dueDate: '',
          dueTime: '',
        },
  })

  async function onSubmit(data: FormValues) {
    try {
      if (isEditing) {
        const { taskType: _type, ...updateData } = data
        await apiClient.patch<Task>(`/api/tasks/${task.id}`, updateData)
        toast.success('Task updated')
      } else {
        await apiClient.post<Task>('/api/tasks', data)
        toast.success('Task created')
      }
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Something went wrong')
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'Add Task'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the task details.'
              : 'Create a new financial task or reminder.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Fund emergency account" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Optional description" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="taskType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {taskTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? (isEditing ? 'Saving...' : 'Creating...')
              : (isEditing ? 'Save Changes' : 'Add Task')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
