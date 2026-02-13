import { z } from 'zod'

const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid amount format')

export const createIncomeSchema = z
  .object({
    accountId: z.string().uuid(),
    recurringId: z.string().uuid().optional(),
    name: z.string().min(1, 'Name is required').max(100),
    amount: decimalString,
    frequency: z.enum(['weekly', 'monthly', 'yearly']),
    expectedDay: z.number().int().min(1).max(31).optional(),
    isConfirmed: z.boolean().optional(),
    confirmationRequiredMonthly: z.boolean().optional(),
    isPrimarySalary: z.boolean().optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.frequency === 'monthly') return data.expectedDay !== undefined
      return true
    },
    { message: 'Expected day is required for monthly income', path: ['expectedDay'] },
  )

export const updateIncomeSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    amount: decimalString.optional(),
    expectedDay: z.number().int().min(1).max(31).optional(),
    isConfirmed: z.boolean().optional(),
    confirmationRequiredMonthly: z.boolean().optional(),
    isPrimarySalary: z.boolean().optional(),
    isActive: z.boolean().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>
