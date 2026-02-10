import { z } from 'zod'

const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid amount format')

export const createTransactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  amount: decimalString,
  currency: z.string().length(3).default('ZAR'),
  transactionDate: z.string().date(),
  postedDate: z.string().date().optional(),
  description: z.string().min(1, 'Description is required').max(500),
  merchantOriginal: z.string().max(200).optional(),
  merchantNormalized: z.string().max(200).optional(),
  notes: z.string().optional(),
  transactionType: z.enum(['debit', 'credit', 'transfer']),
  isReviewed: z.boolean().optional(),
})

export const createTransferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: decimalString,
  currency: z.string().length(3).default('ZAR'),
  transactionDate: z.string().date(),
  description: z.string().min(1, 'Description is required').max(500),
  notes: z.string().optional(),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: 'Source and destination accounts must be different',
  path: ['toAccountId'],
})

export const updateTransactionSchema = z
  .object({
    categoryId: z.string().uuid().nullable().optional(),
    amount: decimalString.optional(),
    transactionDate: z.string().date().optional(),
    postedDate: z.string().date().nullable().optional(),
    description: z.string().min(1).max(500).optional(),
    merchantOriginal: z.string().max(200).nullable().optional(),
    merchantNormalized: z.string().max(200).nullable().optional(),
    notes: z.string().nullable().optional(),
    isReviewed: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type CreateTransferInput = z.infer<typeof createTransferSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
