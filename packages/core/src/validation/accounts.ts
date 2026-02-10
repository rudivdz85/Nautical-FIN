import { z } from 'zod'

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  accountType: z.enum(['cheque', 'savings', 'credit_card', 'investment', 'loan', 'other']),
  classification: z.enum(['spending', 'non_spending']).optional(),
  institution: z.string().max(100).optional(),
  accountNumberMasked: z.string().max(20).optional(),
  currency: z.string().length(3).default('ZAR'),
  currentBalance: z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid balance format').default('0'),
  balanceAsOfDate: z.string().date().optional(),
  creditLimit: z
    .string()
    .regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid credit limit format')
    .optional(),
  isFirstAccount: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
})

export const updateAccountSchema = createAccountSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' },
)

export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
