import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { incomes } from '../db/schema'

export type Income = InferSelectModel<typeof incomes>
export type NewIncome = InferInsertModel<typeof incomes>
export type IncomeFrequency = Income['frequency']
