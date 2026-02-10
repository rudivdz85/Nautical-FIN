import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { accounts } from '../db/schema'

export type Account = InferSelectModel<typeof accounts>
export type NewAccount = InferInsertModel<typeof accounts>

export type AccountType = Account['accountType']
export type AccountClassification = Account['classification']

export type AccountSummary = Pick<
  Account,
  'id' | 'name' | 'accountType' | 'classification' | 'currentBalance' | 'currency' | 'isActive'
>

export const ACCOUNT_TYPE_CLASSIFICATION_DEFAULTS: Record<AccountType, AccountClassification> = {
  cheque: 'spending',
  savings: 'non_spending',
  credit_card: 'spending',
  investment: 'non_spending',
  loan: 'non_spending',
  other: 'spending',
}

export const ALWAYS_NON_SPENDING_TYPES: ReadonlySet<AccountType> = new Set([
  'investment',
  'loan',
])
