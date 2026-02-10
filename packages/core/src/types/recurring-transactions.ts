import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { recurringTransactions } from '../db/schema'

export type RecurringTransaction = InferSelectModel<typeof recurringTransactions>
export type NewRecurringTransaction = InferInsertModel<typeof recurringTransactions>

export type RecurringFrequency = RecurringTransaction['frequency']
export type RecurringAmountType = RecurringTransaction['amountType']
