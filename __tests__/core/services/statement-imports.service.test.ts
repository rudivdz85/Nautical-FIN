import { describe, it, expect, vi, beforeEach } from 'vitest'
import { statementImportsService } from '../../../packages/core/src/services/statement-imports.service'
import { statementImportsRepository } from '../../../packages/core/src/repositories/statement-imports.repository'
import { transactionsRepository } from '../../../packages/core/src/repositories/transactions.repository'
import { accountsRepository } from '../../../packages/core/src/repositories/accounts.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { StatementImport } from '../../../packages/core/src/types/statement-imports'
import type { Account } from '../../../packages/core/src/types/accounts'
import type { Transaction } from '../../../packages/core/src/types/transactions'

vi.mock('../../../packages/core/src/repositories/statement-imports.repository', () => ({
  statementImportsRepository: {
    findByUserId: vi.fn(),
    findByAccountId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/transactions.repository', () => ({
  transactionsRepository: {
    findByDateAndAmount: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/accounts.repository', () => ({
  accountsRepository: {
    findById: vi.fn(),
    adjustBalance: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/categorization-rules.repository', () => ({
  categorizationRulesRepository: {
    findByUserId: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../../../packages/core/src/repositories/merchant-mappings.repository', () => ({
  merchantMappingsRepository: {
    findByUserId: vi.fn().mockResolvedValue([]),
  },
}))

const mockDb = {} as Parameters<typeof statementImportsService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_ACCOUNT_ID = '22222222-2222-2222-2222-222222222222'
const TEST_IMPORT_ID = '33333333-3333-3333-3333-333333333333'

function makeImport(overrides: Partial<StatementImport> = {}): StatementImport {
  return {
    id: TEST_IMPORT_ID,
    userId: TEST_USER_ID,
    accountId: TEST_ACCOUNT_ID,
    filename: 'statement.csv',
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

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: TEST_ACCOUNT_ID,
    userId: TEST_USER_ID,
    name: 'Test Account',
    accountType: 'cheque',
    classification: 'spending',
    institution: null,
    accountNumberMasked: null,
    currency: 'ZAR',
    currentBalance: '10000.00',
    balanceAsOfDate: null,
    creditLimit: null,
    isActive: true,
    isFirstAccount: false,
    syncMethod: 'manual',
    bankSyncEnabled: false,
    bankSyncLastAt: null,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: '44444444-4444-4444-4444-444444444444',
    userId: TEST_USER_ID,
    accountId: TEST_ACCOUNT_ID,
    categoryId: null,
    amount: '100.00',
    currency: 'ZAR',
    transactionDate: '2025-01-15',
    postedDate: null,
    description: 'Imported Transaction',
    merchantOriginal: null,
    merchantNormalized: null,
    notes: null,
    transactionType: 'debit',
    source: 'import',
    externalId: null,
    isRecurringInstance: false,
    recurringId: null,
    transferPairId: null,
    transferToAccountId: null,
    isSplit: false,
    parentTransactionId: null,
    categorizationConfidence: null,
    categorizationMethod: null,
    isAiCategorized: false,
    isReviewed: false,
    importId: TEST_IMPORT_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('statementImportsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns imports for user', async () => {
      const imports = [makeImport()]
      vi.mocked(statementImportsRepository.findByUserId).mockResolvedValue(imports)

      const result = await statementImportsService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual(imports)
    })
  })

  describe('listByAccount', () => {
    it('returns imports for specific account', async () => {
      const imports = [makeImport()]
      vi.mocked(statementImportsRepository.findByAccountId).mockResolvedValue(imports)

      const result = await statementImportsService.listByAccount(
        mockDb, TEST_ACCOUNT_ID, TEST_USER_ID,
      )

      expect(result).toEqual(imports)
      expect(statementImportsRepository.findByAccountId).toHaveBeenCalledWith(
        mockDb, TEST_ACCOUNT_ID, TEST_USER_ID,
      )
    })
  })

  describe('getById', () => {
    it('returns import when found', async () => {
      const imp = makeImport()
      vi.mocked(statementImportsRepository.findById).mockResolvedValue(imp)

      const result = await statementImportsService.getById(mockDb, TEST_IMPORT_ID, TEST_USER_ID)

      expect(result).toEqual(imp)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(statementImportsRepository.findById).mockResolvedValue(undefined)

      await expect(
        statementImportsService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates a statement import record', async () => {
      const imp = makeImport()
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(statementImportsRepository.create).mockResolvedValue(imp)

      const result = await statementImportsService.create(mockDb, TEST_USER_ID, {
        accountId: TEST_ACCOUNT_ID,
        filename: 'statement.csv',
        fileType: 'csv',
        statementStartDate: '2025-01-01',
        statementEndDate: '2025-01-31',
      })

      expect(result).toEqual(imp)
      expect(statementImportsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          accountId: TEST_ACCOUNT_ID,
          status: 'processing',
        }),
      )
    })

    it('throws NotFoundError when account does not exist', async () => {
      vi.mocked(accountsRepository.findById).mockResolvedValue(undefined)

      await expect(
        statementImportsService.create(mockDb, TEST_USER_ID, {
          accountId: '99999999-9999-9999-9999-999999999999',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError for invalid account ID format', async () => {
      await expect(
        statementImportsService.create(mockDb, TEST_USER_ID, {
          accountId: 'not-a-uuid',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('process', () => {
    it('processes transactions and creates them', async () => {
      const imp = makeImport()
      const account = makeAccount()
      const txn = makeTransaction()

      vi.mocked(statementImportsRepository.findById).mockResolvedValue(imp)
      vi.mocked(accountsRepository.findById).mockResolvedValue(account)
      vi.mocked(transactionsRepository.findByDateAndAmount).mockResolvedValue([])
      vi.mocked(transactionsRepository.create).mockResolvedValue(txn)
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(account)
      vi.mocked(statementImportsRepository.update).mockResolvedValue(
        makeImport({ status: 'completed', transactionsImported: 2 }),
      )

      const result = await statementImportsService.process(mockDb, TEST_IMPORT_ID, TEST_USER_ID, {
        transactions: [
          {
            transactionDate: '2025-01-15',
            amount: '100.00',
            description: 'Woolworths',
            transactionType: 'debit',
          },
          {
            transactionDate: '2025-01-20',
            amount: '500.00',
            description: 'Salary',
            transactionType: 'credit',
          },
        ],
      })

      expect(result.imported).toBe(2)
      expect(result.duplicates).toBe(0)
      expect(result.failed).toBe(0)
      expect(transactionsRepository.create).toHaveBeenCalledTimes(2)
    })

    it('creates transactions with source=import and isReviewed=false', async () => {
      vi.mocked(statementImportsRepository.findById).mockResolvedValue(makeImport())
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(transactionsRepository.findByDateAndAmount).mockResolvedValue([])
      vi.mocked(transactionsRepository.create).mockResolvedValue(makeTransaction())
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())
      vi.mocked(statementImportsRepository.update).mockResolvedValue(makeImport())

      await statementImportsService.process(mockDb, TEST_IMPORT_ID, TEST_USER_ID, {
        transactions: [
          {
            transactionDate: '2025-01-15',
            amount: '100.00',
            description: 'Test',
            transactionType: 'debit',
          },
        ],
      })

      expect(transactionsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          source: 'import',
          isReviewed: false,
          importId: TEST_IMPORT_ID,
        }),
      )
    })

    it('adjusts balance for debit transactions (subtract)', async () => {
      vi.mocked(statementImportsRepository.findById).mockResolvedValue(makeImport())
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(transactionsRepository.findByDateAndAmount).mockResolvedValue([])
      vi.mocked(transactionsRepository.create).mockResolvedValue(makeTransaction())
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())
      vi.mocked(statementImportsRepository.update).mockResolvedValue(makeImport())

      await statementImportsService.process(mockDb, TEST_IMPORT_ID, TEST_USER_ID, {
        transactions: [
          {
            transactionDate: '2025-01-15',
            amount: '100.00',
            description: 'Groceries',
            transactionType: 'debit',
          },
        ],
      })

      expect(accountsRepository.adjustBalance).toHaveBeenCalledWith(
        mockDb, TEST_ACCOUNT_ID, TEST_USER_ID, '-100.00',
      )
    })

    it('adjusts balance for credit transactions (add)', async () => {
      vi.mocked(statementImportsRepository.findById).mockResolvedValue(makeImport())
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(transactionsRepository.findByDateAndAmount).mockResolvedValue([])
      vi.mocked(transactionsRepository.create).mockResolvedValue(makeTransaction({ transactionType: 'credit' }))
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())
      vi.mocked(statementImportsRepository.update).mockResolvedValue(makeImport())

      await statementImportsService.process(mockDb, TEST_IMPORT_ID, TEST_USER_ID, {
        transactions: [
          {
            transactionDate: '2025-01-25',
            amount: '25000.00',
            description: 'Salary',
            transactionType: 'credit',
          },
        ],
      })

      expect(accountsRepository.adjustBalance).toHaveBeenCalledWith(
        mockDb, TEST_ACCOUNT_ID, TEST_USER_ID, '25000.00',
      )
    })

    it('detects duplicates by date+amount and skips them', async () => {
      vi.mocked(statementImportsRepository.findById).mockResolvedValue(makeImport())
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(transactionsRepository.findByDateAndAmount).mockResolvedValue([makeTransaction()])
      vi.mocked(statementImportsRepository.update).mockResolvedValue(
        makeImport({ transactionsDuplicates: 1 }),
      )

      const result = await statementImportsService.process(mockDb, TEST_IMPORT_ID, TEST_USER_ID, {
        transactions: [
          {
            transactionDate: '2025-01-15',
            amount: '100.00',
            description: 'Duplicate',
            transactionType: 'debit',
          },
        ],
      })

      expect(result.imported).toBe(0)
      expect(result.duplicates).toBe(1)
      expect(transactionsRepository.create).not.toHaveBeenCalled()
    })

    it('updates import record with final counts and status', async () => {
      vi.mocked(statementImportsRepository.findById).mockResolvedValue(makeImport())
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(transactionsRepository.findByDateAndAmount).mockResolvedValue([])
      vi.mocked(transactionsRepository.create).mockResolvedValue(makeTransaction())
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())
      vi.mocked(statementImportsRepository.update).mockResolvedValue(makeImport({ status: 'completed' }))

      await statementImportsService.process(mockDb, TEST_IMPORT_ID, TEST_USER_ID, {
        transactions: [
          {
            transactionDate: '2025-01-10',
            amount: '50.00',
            description: 'Coffee',
            transactionType: 'debit',
          },
        ],
      })

      expect(statementImportsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_IMPORT_ID, TEST_USER_ID,
        expect.objectContaining({
          status: 'completed',
          transactionsImported: 1,
          transactionsDuplicates: 0,
          transactionsFailed: 0,
        }),
      )
    })

    it('sets status to partial when some transactions fail', async () => {
      vi.mocked(statementImportsRepository.findById).mockResolvedValue(makeImport())
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(transactionsRepository.findByDateAndAmount).mockResolvedValue([])
      vi.mocked(transactionsRepository.create)
        .mockResolvedValueOnce(makeTransaction())
        .mockRejectedValueOnce(new Error('DB error'))
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())
      vi.mocked(statementImportsRepository.update).mockResolvedValue(makeImport({ status: 'partial' }))

      const result = await statementImportsService.process(mockDb, TEST_IMPORT_ID, TEST_USER_ID, {
        transactions: [
          {
            transactionDate: '2025-01-10',
            amount: '50.00',
            description: 'Success',
            transactionType: 'debit',
          },
          {
            transactionDate: '2025-01-11',
            amount: '75.00',
            description: 'Failure',
            transactionType: 'debit',
          },
        ],
      })

      expect(result.imported).toBe(1)
      expect(result.failed).toBe(1)
      expect(statementImportsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_IMPORT_ID, TEST_USER_ID,
        expect.objectContaining({ status: 'partial' }),
      )
    })

    it('sets status to failed when all transactions fail', async () => {
      vi.mocked(statementImportsRepository.findById).mockResolvedValue(makeImport())
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(transactionsRepository.findByDateAndAmount).mockResolvedValue([])
      vi.mocked(transactionsRepository.create).mockRejectedValue(new Error('DB error'))
      vi.mocked(statementImportsRepository.update).mockResolvedValue(makeImport({ status: 'failed' }))

      const result = await statementImportsService.process(mockDb, TEST_IMPORT_ID, TEST_USER_ID, {
        transactions: [
          {
            transactionDate: '2025-01-10',
            amount: '50.00',
            description: 'Failure',
            transactionType: 'debit',
          },
        ],
      })

      expect(result.imported).toBe(0)
      expect(result.failed).toBe(1)
      expect(statementImportsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_IMPORT_ID, TEST_USER_ID,
        expect.objectContaining({ status: 'failed' }),
      )
    })

    it('throws NotFoundError when import does not exist', async () => {
      vi.mocked(statementImportsRepository.findById).mockResolvedValue(undefined)

      await expect(
        statementImportsService.process(mockDb, 'nonexistent', TEST_USER_ID, {
          transactions: [
            {
              transactionDate: '2025-01-10',
              amount: '50.00',
              description: 'Test',
              transactionType: 'debit',
            },
          ],
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when import is already processed', async () => {
      vi.mocked(statementImportsRepository.findById).mockResolvedValue(
        makeImport({ status: 'completed' }),
      )

      await expect(
        statementImportsService.process(mockDb, TEST_IMPORT_ID, TEST_USER_ID, {
          transactions: [
            {
              transactionDate: '2025-01-10',
              amount: '50.00',
              description: 'Test',
              transactionType: 'debit',
            },
          ],
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for empty transactions array', async () => {
      await expect(
        statementImportsService.process(mockDb, TEST_IMPORT_ID, TEST_USER_ID, {
          transactions: [],
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('returns balance check when opening and closing balances are provided', async () => {
      const imp = makeImport({
        openingBalance: '10000.00',
        closingBalance: '8500.00',
      })
      vi.mocked(statementImportsRepository.findById).mockResolvedValue(imp)
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(transactionsRepository.findByDateAndAmount).mockResolvedValue([])
      vi.mocked(transactionsRepository.create).mockResolvedValue(makeTransaction())
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())
      vi.mocked(statementImportsRepository.update).mockResolvedValue(makeImport())

      const result = await statementImportsService.process(mockDb, TEST_IMPORT_ID, TEST_USER_ID, {
        transactions: [
          {
            transactionDate: '2025-01-15',
            amount: '1000.00',
            description: 'Groceries',
            transactionType: 'debit',
          },
          {
            transactionDate: '2025-01-20',
            amount: '500.00',
            description: 'Another debit',
            transactionType: 'debit',
          },
        ],
      })

      expect(result.balanceCheck).toBeDefined()
      expect(result.balanceCheck!.openingBalance).toBe('10000.00')
      expect(result.balanceCheck!.closingBalance).toBe('8500.00')
      expect(result.balanceCheck!.computedClosing).toBe('8500.00')
      expect(result.balanceCheck!.difference).toBe('0.00')
      expect(result.balanceCheck!.isReconciled).toBe(true)
    })

    it('detects balance discrepancy', async () => {
      const imp = makeImport({
        openingBalance: '10000.00',
        closingBalance: '9000.00',
      })
      vi.mocked(statementImportsRepository.findById).mockResolvedValue(imp)
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(transactionsRepository.findByDateAndAmount).mockResolvedValue([])
      vi.mocked(transactionsRepository.create).mockResolvedValue(makeTransaction())
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())
      vi.mocked(statementImportsRepository.update).mockResolvedValue(makeImport())

      const result = await statementImportsService.process(mockDb, TEST_IMPORT_ID, TEST_USER_ID, {
        transactions: [
          {
            transactionDate: '2025-01-15',
            amount: '500.00',
            description: 'Only 500 debit',
            transactionType: 'debit',
          },
        ],
      })

      expect(result.balanceCheck).toBeDefined()
      expect(result.balanceCheck!.computedClosing).toBe('9500.00')
      expect(result.balanceCheck!.difference).toBe('500.00')
      expect(result.balanceCheck!.isReconciled).toBe(false)
    })

    it('omits balance check when no balances on import', async () => {
      const imp = makeImport({
        openingBalance: null,
        closingBalance: null,
      })
      vi.mocked(statementImportsRepository.findById).mockResolvedValue(imp)
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(transactionsRepository.findByDateAndAmount).mockResolvedValue([])
      vi.mocked(transactionsRepository.create).mockResolvedValue(makeTransaction())
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())
      vi.mocked(statementImportsRepository.update).mockResolvedValue(makeImport())

      const result = await statementImportsService.process(mockDb, TEST_IMPORT_ID, TEST_USER_ID, {
        transactions: [
          {
            transactionDate: '2025-01-15',
            amount: '50.00',
            description: 'Test',
            transactionType: 'debit',
          },
        ],
      })

      expect(result.balanceCheck).toBeUndefined()
    })

    it('preserves merchantOriginal from parsed data', async () => {
      vi.mocked(statementImportsRepository.findById).mockResolvedValue(makeImport())
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(transactionsRepository.findByDateAndAmount).mockResolvedValue([])
      vi.mocked(transactionsRepository.create).mockResolvedValue(makeTransaction())
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())
      vi.mocked(statementImportsRepository.update).mockResolvedValue(makeImport())

      await statementImportsService.process(mockDb, TEST_IMPORT_ID, TEST_USER_ID, {
        transactions: [
          {
            transactionDate: '2025-01-15',
            amount: '100.00',
            description: 'Woolworths',
            transactionType: 'debit',
            merchantOriginal: 'WOOLWORTHS SAND C2309328',
          },
        ],
      })

      expect(transactionsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          merchantOriginal: 'WOOLWORTHS SAND C2309328',
        }),
      )
    })
  })
})
