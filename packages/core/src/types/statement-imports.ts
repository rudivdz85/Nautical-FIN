import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { statementImports } from '../db/schema'

export type StatementImport = InferSelectModel<typeof statementImports>
export type NewStatementImport = InferInsertModel<typeof statementImports>
export type ImportStatus = StatementImport['status']

export interface ParsedTransaction {
  transactionDate: string
  amount: string
  description: string
  transactionType: 'debit' | 'credit'
  merchantOriginal?: string
  externalId?: string
  postedDate?: string
}

export interface ImportResult {
  import: StatementImport
  imported: number
  duplicates: number
  failed: number
}
