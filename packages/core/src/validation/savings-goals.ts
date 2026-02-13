import { z } from 'zod'

const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid amount format')

const positiveDecimalString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format')
  .refine((val) => parseFloat(val) > 0, 'Amount must be greater than zero')

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')

const goalTypes = ['emergency', 'specific', 'general'] as const

export const createSavingsGoalSchema = z.object({
  linkedAccountId: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(100),
  goalType: z.enum(goalTypes),
  targetAmount: positiveDecimalString.optional(),
  targetDate: dateString.optional(),
  targetMonthsOfExpenses: z.number().int().min(1).max(120).optional(),
  monthlyContribution: positiveDecimalString.optional(),
  priority: z.number().int().min(1).max(100).optional(),
  notes: z.string().max(1000).optional(),
})

export const updateSavingsGoalSchema = z
  .object({
    linkedAccountId: z.string().uuid().nullable().optional(),
    name: z.string().min(1).max(100).optional(),
    targetAmount: positiveDecimalString.nullable().optional(),
    currentAmount: decimalString.optional(),
    targetDate: dateString.nullable().optional(),
    targetMonthsOfExpenses: z.number().int().min(1).max(120).nullable().optional(),
    monthlyContribution: positiveDecimalString.nullable().optional(),
    priority: z.number().int().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const createSavingsContributionSchema = z.object({
  amount: positiveDecimalString,
  contributionDate: dateString,
  transactionId: z.string().uuid().optional(),
  source: z.string().max(50).optional(),
})

export const updateSavingsContributionSchema = z
  .object({
    amount: positiveDecimalString.optional(),
    contributionDate: dateString.optional(),
    source: z.string().max(50).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>
export type UpdateSavingsGoalInput = z.infer<typeof updateSavingsGoalSchema>
export type CreateSavingsContributionInput = z.infer<typeof createSavingsContributionSchema>
export type UpdateSavingsContributionInput = z.infer<typeof updateSavingsContributionSchema>
