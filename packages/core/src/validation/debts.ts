import { z } from 'zod'

const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid amount format')

const positiveDecimalString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format')
  .refine((val) => parseFloat(val) > 0, 'Amount must be greater than zero')

const debtTypes = [
  'home_loan',
  'vehicle',
  'personal_loan',
  'credit_card',
  'overdraft',
  'store_account',
  'student_loan',
  'other',
] as const

export const createDebtSchema = z.object({
  linkedAccountId: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(100),
  debtType: z.enum(debtTypes),
  creditor: z.string().max(100).optional(),
  originalAmount: positiveDecimalString,
  currentBalance: decimalString,
  interestRate: decimalString.optional(),
  interestType: z.enum(['compound', 'simple']).optional(),
  minimumPayment: positiveDecimalString.optional(),
  fixedPayment: positiveDecimalString.optional(),
  paymentDay: z.number().int().min(1).max(31).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  expectedPayoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  notes: z.string().max(1000).optional(),
})

export const updateDebtSchema = z
  .object({
    linkedAccountId: z.string().uuid().nullable().optional(),
    name: z.string().min(1).max(100).optional(),
    creditor: z.string().max(100).nullable().optional(),
    currentBalance: decimalString.optional(),
    interestRate: decimalString.nullable().optional(),
    interestType: z.enum(['compound', 'simple']).optional(),
    minimumPayment: positiveDecimalString.nullable().optional(),
    fixedPayment: positiveDecimalString.nullable().optional(),
    paymentDay: z.number().int().min(1).max(31).nullable().optional(),
    expectedPayoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').nullable().optional(),
    isActive: z.boolean().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const createDebtPaymentSchema = z.object({
  amount: positiveDecimalString,
  principalAmount: positiveDecimalString.optional(),
  interestAmount: positiveDecimalString.optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  transactionId: z.string().uuid().optional(),
})

export const updateDebtPaymentSchema = z
  .object({
    amount: positiveDecimalString.optional(),
    principalAmount: positiveDecimalString.nullable().optional(),
    interestAmount: positiveDecimalString.nullable().optional(),
    paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export type CreateDebtInput = z.infer<typeof createDebtSchema>
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>
export type CreateDebtPaymentInput = z.infer<typeof createDebtPaymentSchema>
export type UpdateDebtPaymentInput = z.infer<typeof updateDebtPaymentSchema>
