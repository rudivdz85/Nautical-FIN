import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { debts, debtPayments } from '../db/schema'

export type Debt = InferSelectModel<typeof debts>
export type NewDebt = InferInsertModel<typeof debts>
export type DebtType = Debt['debtType']

export type DebtPayment = InferSelectModel<typeof debtPayments>
export type NewDebtPayment = InferInsertModel<typeof debtPayments>

export interface DebtWithPayments extends Debt {
  payments: DebtPayment[]
}
