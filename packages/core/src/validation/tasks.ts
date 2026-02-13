import { z } from 'zod'

const taskTypes = [
  'retro_reminder',
  'fund_account',
  'balance_low',
  'recurring_failed',
  'variable_recurring_confirm',
  'unconfirmed_income',
  'budget_threshold',
  'unusual_spending',
  'goal_milestone',
  'bill_increase',
] as const

const taskPriorities = ['high', 'medium', 'low'] as const

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')

const timeString = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format')

export const createTaskSchema = z.object({
  taskType: z.enum(taskTypes),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(taskPriorities).optional(),
  dueDate: dateString.optional(),
  dueTime: timeString.optional(),
  isRecurring: z.boolean().optional(),
  recurringSourceId: z.string().uuid().optional(),
  relatedEntityType: z.string().max(50).optional(),
  relatedEntityId: z.string().uuid().optional(),
  actionPath: z.string().max(200).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    priority: z.enum(taskPriorities).optional(),
    dueDate: dateString.nullable().optional(),
    dueTime: timeString.nullable().optional(),
    actionPath: z.string().max(200).nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const snoozeTaskSchema = z.object({
  snoozedUntil: z.string().datetime({ message: 'Invalid datetime format' }),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type SnoozeTaskInput = z.infer<typeof snoozeTaskSchema>
