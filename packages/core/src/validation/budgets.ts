import { z } from 'zod'

const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid amount format')

// --- Budget ---

export const createBudgetSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  notes: z.string().max(1000).optional(),
})

export const updateBudgetSchema = z
  .object({
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

// --- Budget Item (per-category allocation) ---

export const createBudgetItemSchema = z.object({
  categoryId: z.string().uuid(),
  plannedAmount: decimalString,
  surplusAction: z.enum(['rollover', 'savings', 'general']).optional(),
})

export const updateBudgetItemSchema = z
  .object({
    plannedAmount: decimalString.optional(),
    surplusAction: z.enum(['rollover', 'savings', 'general']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

// --- Budget Income ---

export const createBudgetIncomeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  expectedAmount: decimalString,
  expectedDate: z.string().date().optional(),
  incomeId: z.string().uuid().optional(),
})

export const updateBudgetIncomeSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    expectedAmount: decimalString.optional(),
    expectedDate: z.string().date().nullable().optional(),
    isConfirmed: z.boolean().optional(),
    actualAmount: decimalString.optional(),
    actualDate: z.string().date().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

// --- Planned One-Off ---

export const createPlannedOneOffSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  description: z.string().min(1, 'Description is required').max(255),
  amount: decimalString,
  expectedDate: z.string().date(),
  isReserved: z.boolean().optional(),
  reminderDaysBefore: z.number().int().min(0).max(90).optional(),
  reminderThreshold: decimalString.optional(),
})

export const updatePlannedOneOffSchema = z
  .object({
    categoryId: z.string().uuid().nullable().optional(),
    description: z.string().min(1).max(255).optional(),
    amount: decimalString.optional(),
    expectedDate: z.string().date().optional(),
    isReserved: z.boolean().optional(),
    reminderDaysBefore: z.number().int().min(0).max(90).optional(),
    reminderThreshold: decimalString.nullable().optional(),
    isCompleted: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>
export type CreateBudgetItemInput = z.infer<typeof createBudgetItemSchema>
export type UpdateBudgetItemInput = z.infer<typeof updateBudgetItemSchema>
export type CreateBudgetIncomeInput = z.infer<typeof createBudgetIncomeSchema>
export type UpdateBudgetIncomeInput = z.infer<typeof updateBudgetIncomeSchema>
export type CreatePlannedOneOffInput = z.infer<typeof createPlannedOneOffSchema>
export type UpdatePlannedOneOffInput = z.infer<typeof updatePlannedOneOffSchema>
