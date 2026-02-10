import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { transactions } from '../db/schema'

export type Transaction = InferSelectModel<typeof transactions>
export type NewTransaction = InferInsertModel<typeof transactions>

export type TransactionType = Transaction['transactionType']
export type TransactionSource = Transaction['source']

export interface TransactionFilters {
  accountId?: string
  categoryId?: string
  transactionType?: TransactionType
  startDate?: string
  endDate?: string
  isReviewed?: boolean
  source?: TransactionSource
}
