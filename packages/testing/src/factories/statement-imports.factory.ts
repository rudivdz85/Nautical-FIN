import type { StatementImport } from '@fin/core/types'
import type { CreateStatementImportInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestStatementImport(
  overrides: Partial<StatementImport> = {},
): StatementImport {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    accountId: nextId(),
    filename: 'statement-2025-01.csv',
    fileType: 'csv',
    fileUrl: null,
    statementStartDate: '2025-01-01',
    statementEndDate: '2025-01-31',
    openingBalance: '10000.00',
    closingBalance: '8500.00',
    transactionsImported: 0,
    transactionsDuplicates: 0,
    transactionsFailed: 0,
    status: 'processing',
    errorMessage: null,
    importedAt: new Date(),
    ...overrides,
  }
}

export function createTestStatementImportInput(
  overrides: Partial<CreateStatementImportInput> = {},
): CreateStatementImportInput {
  return {
    accountId: '00000000-0000-0000-0000-000000000001',
    filename: 'statement-2025-01.csv',
    fileType: 'csv',
    statementStartDate: '2025-01-01',
    statementEndDate: '2025-01-31',
    ...overrides,
  }
}

export function resetStatementImportFactoryCounters(): void {
  counter = 0
}
