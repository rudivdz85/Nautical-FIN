import { eq, and } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { statementImports } from '../db/schema'
import type { StatementImport, NewStatementImport } from '../types/statement-imports'

type Database = NeonHttpDatabase

export const statementImportsRepository = {
  async findByUserId(db: Database, userId: string): Promise<StatementImport[]> {
    return db
      .select()
      .from(statementImports)
      .where(eq(statementImports.userId, userId))
      .orderBy(statementImports.importedAt)
  },

  async findByAccountId(
    db: Database,
    accountId: string,
    userId: string,
  ): Promise<StatementImport[]> {
    return db
      .select()
      .from(statementImports)
      .where(
        and(
          eq(statementImports.accountId, accountId),
          eq(statementImports.userId, userId),
        ),
      )
      .orderBy(statementImports.importedAt)
  },

  async findById(
    db: Database,
    id: string,
    userId: string,
  ): Promise<StatementImport | undefined> {
    const results = await db
      .select()
      .from(statementImports)
      .where(and(eq(statementImports.id, id), eq(statementImports.userId, userId)))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewStatementImport): Promise<StatementImport> {
    const results = await db.insert(statementImports).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<
      Pick<
        StatementImport,
        | 'status'
        | 'transactionsImported'
        | 'transactionsDuplicates'
        | 'transactionsFailed'
        | 'errorMessage'
        | 'statementStartDate'
        | 'statementEndDate'
        | 'openingBalance'
        | 'closingBalance'
      >
    >,
  ): Promise<StatementImport | undefined> {
    const results = await db
      .update(statementImports)
      .set(data)
      .where(and(eq(statementImports.id, id), eq(statementImports.userId, userId)))
      .returning()

    return results[0]
  },
}
