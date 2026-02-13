import { z } from 'zod'

const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid amount format')

const positiveDecimalString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format')
  .refine((val) => parseFloat(val) > 0, 'Amount must be greater than zero')

export const createActualSchema = z.object({
  budgetId: z.string().uuid().optional(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  notes: z.string().max(1000).optional(),
})

export const updateActualSchema = z
  .object({
    totalIncome: decimalString.optional(),
    totalExpenses: decimalString.optional(),
    netSavings: decimalString.optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const createActualCategorySchema = z.object({
  categoryId: z.string().uuid(),
  totalAmount: decimalString.optional(),
  transactionCount: z.number().int().min(0).optional(),
  budgetedAmount: decimalString.optional(),
})

export const updateActualCategorySchema = z
  .object({
    totalAmount: decimalString.optional(),
    transactionCount: z.number().int().min(0).optional(),
    budgetedAmount: decimalString.nullable().optional(),
    variance: decimalString.nullable().optional(),
    variancePercentage: decimalString.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const createBalanceConfirmationSchema = z.object({
  accountId: z.string().uuid(),
  expectedBalance: decimalString,
  notes: z.string().max(1000).optional(),
})

export const confirmBalanceSchema = z.object({
  confirmedBalance: decimalString,
  notes: z.string().max(1000).optional(),
})

export const createSurplusAllocationSchema = z.object({
  categoryId: z.string().uuid().optional(),
  amount: positiveDecimalString,
  action: z.enum(['rollover', 'savings', 'general']),
  targetSavingsGoalId: z.string().uuid().optional(),
  targetCategoryId: z.string().uuid().optional(),
})

export type CreateActualInput = z.infer<typeof createActualSchema>
export type UpdateActualInput = z.infer<typeof updateActualSchema>
export type CreateActualCategoryInput = z.infer<typeof createActualCategorySchema>
export type UpdateActualCategoryInput = z.infer<typeof updateActualCategorySchema>
export type CreateBalanceConfirmationInput = z.infer<typeof createBalanceConfirmationSchema>
export type ConfirmBalanceInput = z.infer<typeof confirmBalanceSchema>
export type CreateSurplusAllocationInput = z.infer<typeof createSurplusAllocationSchema>
