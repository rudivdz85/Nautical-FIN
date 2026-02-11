import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { statementImportsRepository } from '../repositories/statement-imports.repository'
import { transactionsRepository } from '../repositories/transactions.repository'
import { accountsRepository } from '../repositories/accounts.repository'
import {
  createStatementImportSchema,
  processImportSchema,
} from '../validation/statement-imports'
import type { StatementImport, ImportResult } from '../types/statement-imports'
import type { ParsedTransactionInput } from '../validation/statement-imports'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const statementImportsService = {
  async list(db: Database, userId: string): Promise<StatementImport[]> {
    return statementImportsRepository.findByUserId(db, userId)
  },

  async listByAccount(
    db: Database,
    accountId: string,
    userId: string,
  ): Promise<StatementImport[]> {
    return statementImportsRepository.findByAccountId(db, accountId, userId)
  },

  async getById(db: Database, id: string, userId: string): Promise<StatementImport> {
    const imp = await statementImportsRepository.findById(db, id, userId)
    if (!imp) {
      throw new NotFoundError('Statement import', id)
    }
    return imp
  },

  async create(db: Database, userId: string, input: unknown): Promise<StatementImport> {
    const parsed = createStatementImportSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid import data', parsed.error.issues)
    }

    const account = await accountsRepository.findById(db, parsed.data.accountId, userId)
    if (!account) {
      throw new NotFoundError('Account', parsed.data.accountId)
    }

    return statementImportsRepository.create(db, {
      userId,
      accountId: parsed.data.accountId,
      filename: parsed.data.filename,
      fileType: parsed.data.fileType,
      statementStartDate: parsed.data.statementStartDate,
      statementEndDate: parsed.data.statementEndDate,
      openingBalance: parsed.data.openingBalance,
      closingBalance: parsed.data.closingBalance,
      status: 'processing',
    })
  },

  async process(
    db: Database,
    importId: string,
    userId: string,
    input: unknown,
  ): Promise<ImportResult> {
    const parsed = processImportSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid import data', parsed.error.issues)
    }

    const imp = await statementImportsRepository.findById(db, importId, userId)
    if (!imp) {
      throw new NotFoundError('Statement import', importId)
    }

    if (imp.status !== 'processing') {
      throw new ValidationError('Import has already been processed', {
        status: [`Import is currently ${imp.status}`],
      })
    }

    const account = await accountsRepository.findById(db, imp.accountId, userId)
    if (!account) {
      throw new NotFoundError('Account', imp.accountId)
    }

    let imported = 0
    let duplicates = 0
    let failed = 0

    for (const row of parsed.data.transactions) {
      try {
        const isDuplicate = await checkDuplicate(db, imp.accountId, row)

        if (isDuplicate) {
          duplicates++
          continue
        }

        await transactionsRepository.create(db, {
          userId,
          accountId: imp.accountId,
          amount: row.amount,
          transactionDate: row.transactionDate,
          postedDate: row.postedDate,
          description: row.description,
          merchantOriginal: row.merchantOriginal,
          transactionType: row.transactionType,
          externalId: row.externalId,
          source: 'import',
          isReviewed: false,
          importId,
        })

        const balanceDelta = row.transactionType === 'debit'
          ? `-${row.amount}`
          : row.amount
        await accountsRepository.adjustBalance(db, imp.accountId, userId, balanceDelta)

        imported++
      } catch {
        failed++
      }
    }

    const status = failed === parsed.data.transactions.length
      ? 'failed'
      : failed > 0
        ? 'partial'
        : 'completed'

    const updated = await statementImportsRepository.update(db, importId, userId, {
      status,
      transactionsImported: imported,
      transactionsDuplicates: duplicates,
      transactionsFailed: failed,
    })

    return {
      import: updated ?? imp,
      imported,
      duplicates,
      failed,
    }
  },
}

async function checkDuplicate(
  db: Database,
  accountId: string,
  row: ParsedTransactionInput,
): Promise<boolean> {
  const matches = await transactionsRepository.findByDateAndAmount(
    db,
    accountId,
    row.transactionDate,
    row.amount,
  )
  return matches.length > 0
}

function buildValidationError(
  message: string,
  issues: { path: (string | number)[]; message: string }[],
): ValidationError {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of issues) {
    const path = issue.path.join('.')
    if (!fieldErrors[path]) {
      fieldErrors[path] = []
    }
    fieldErrors[path].push(issue.message)
  }
  return new ValidationError(message, fieldErrors)
}
