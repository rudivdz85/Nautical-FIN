import { z } from 'zod'

const decimalString = z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'Must be a valid decimal')
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')

export const createNetWorthSnapshotSchema = z.object({
  snapshotDate: dateString,
  totalAssets: decimalString,
  totalLiabilities: decimalString,
  netWorth: decimalString,
  totalCashSpend: decimalString.nullish(),
  totalCreditAvailable: decimalString.nullish(),
  totalSavings: decimalString.nullish(),
  totalDebt: decimalString.nullish(),
  breakdown: z.record(z.unknown()).nullish(),
})

export type CreateNetWorthSnapshotInput = z.input<typeof createNetWorthSnapshotSchema>
