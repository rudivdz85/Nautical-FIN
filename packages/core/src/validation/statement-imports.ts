import { z } from 'zod'

const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid amount format')

export const createStatementImportSchema = z.object({
  accountId: z.string().uuid(),
  filename: z.string().max(255).optional(),
  fileType: z.enum(['csv', 'ofx', 'qfx', 'pdf', 'xls', 'xlsx']).optional(),
  statementStartDate: z.string().date().optional(),
  statementEndDate: z.string().date().optional(),
  openingBalance: decimalString.optional(),
  closingBalance: decimalString.optional(),
})

const parsedTransactionSchema = z.object({
  transactionDate: z.string().date(),
  amount: decimalString,
  description: z.string().min(1).max(500),
  transactionType: z.enum(['debit', 'credit']),
  merchantOriginal: z.string().max(200).optional(),
  externalId: z.string().max(100).optional(),
  postedDate: z.string().date().optional(),
})

export const processImportSchema = z.object({
  transactions: z.array(parsedTransactionSchema).min(1, 'At least one transaction is required'),
})

export type CreateStatementImportInput = z.infer<typeof createStatementImportSchema>
export type ProcessImportInput = z.infer<typeof processImportSchema>
export type ParsedTransactionInput = z.infer<typeof parsedTransactionSchema>
