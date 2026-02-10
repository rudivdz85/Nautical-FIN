import { z } from 'zod'

const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid amount format')

export const createRecurringTransactionSchema = z
  .object({
    accountId: z.string().uuid(),
    categoryId: z.string().uuid().optional(),
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(255).optional(),
    amountType: z.enum(['fixed', 'variable']),
    amount: decimalString.optional(),
    amountMax: decimalString.optional(),
    frequency: z.enum(['weekly', 'monthly', 'yearly']),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    startDate: z.string().date(),
    transactionType: z.enum(['debit', 'credit']),
    requiresConfirmation: z.boolean().optional(),
    merchantPattern: z.string().max(200).optional(),
  })
  .refine(
    (data) => {
      if (data.amountType === 'fixed') return !!data.amount
      return true
    },
    { message: 'Amount is required for fixed recurring transactions', path: ['amount'] },
  )
  .refine(
    (data) => {
      if (data.amountType === 'variable') return !!data.amountMax
      return true
    },
    { message: 'Max amount is required for variable recurring transactions', path: ['amountMax'] },
  )
  .refine(
    (data) => {
      if (data.frequency === 'monthly') return data.dayOfMonth !== undefined
      return true
    },
    { message: 'Day of month is required for monthly frequency', path: ['dayOfMonth'] },
  )
  .refine(
    (data) => {
      if (data.frequency === 'weekly') return data.dayOfWeek !== undefined
      return true
    },
    { message: 'Day of week is required for weekly frequency', path: ['dayOfWeek'] },
  )

export const updateRecurringTransactionSchema = z
  .object({
    categoryId: z.string().uuid().nullable().optional(),
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(255).nullable().optional(),
    amount: decimalString.optional(),
    amountMax: decimalString.optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    requiresConfirmation: z.boolean().optional(),
    merchantPattern: z.string().max(200).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export type CreateRecurringTransactionInput = z.infer<typeof createRecurringTransactionSchema>
export type UpdateRecurringTransactionInput = z.infer<typeof updateRecurringTransactionSchema>
