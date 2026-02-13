import { z } from 'zod'

const decimalString = z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'Must be a valid decimal')
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')

export const createDailyTrackerEntrySchema = z.object({
  date: dateString,
  expectedIncome: decimalString.optional().default('0'),
  expectedDebtPayments: decimalString.optional().default('0'),
  expectedExpenses: decimalString.optional().default('0'),
  predictedSpend: decimalString.optional().default('0'),
  manualOverride: decimalString.nullish(),
  runningBalance: decimalString.optional().default('0'),
  hasAlerts: z.boolean().optional().default(false),
  alerts: z.record(z.unknown()).nullish(),
  isPayday: z.boolean().optional().default(false),
  incomeDetails: z.record(z.unknown()).nullish(),
  debtDetails: z.record(z.unknown()).nullish(),
  expenseDetails: z.record(z.unknown()).nullish(),
})

export const updateDailyTrackerEntrySchema = z
  .object({
    expectedIncome: decimalString.optional(),
    expectedDebtPayments: decimalString.optional(),
    expectedExpenses: decimalString.optional(),
    predictedSpend: decimalString.optional(),
    manualOverride: decimalString.nullish(),
    runningBalance: decimalString.optional(),
    hasAlerts: z.boolean().optional(),
    alerts: z.record(z.unknown()).nullish(),
    isPayday: z.boolean().optional(),
    incomeDetails: z.record(z.unknown()).nullish(),
    debtDetails: z.record(z.unknown()).nullish(),
    expenseDetails: z.record(z.unknown()).nullish(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  })

export type CreateDailyTrackerEntryInput = z.input<typeof createDailyTrackerEntrySchema>
export type UpdateDailyTrackerEntryInput = z.input<typeof updateDailyTrackerEntrySchema>
