import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recurringTransactionsService } from '../../../packages/core/src/services/recurring-transactions.service'
import { recurringTransactionsRepository } from '../../../packages/core/src/repositories/recurring-transactions.repository'
import { accountsRepository } from '../../../packages/core/src/repositories/accounts.repository'
import { transactionsRepository } from '../../../packages/core/src/repositories/transactions.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { RecurringTransaction } from '../../../packages/core/src/types/recurring-transactions'
import type { Account } from '../../../packages/core/src/types/accounts'
import type { Transaction } from '../../../packages/core/src/types/transactions'

vi.mock('../../../packages/core/src/repositories/recurring-transactions.repository', () => ({
  recurringTransactionsRepository: {
    findByUserId: vi.fn(),
    findAllByUserId: vi.fn(),
    findById: vi.fn(),
    findDue: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/accounts.repository', () => ({
  accountsRepository: {
    findById: vi.fn(),
    adjustBalance: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/transactions.repository', () => ({
  transactionsRepository: {
    create: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof recurringTransactionsService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_ACCOUNT_ID = '22222222-2222-2222-2222-222222222222'
const TEST_RECURRING_ID = '44444444-4444-4444-4444-444444444444'

function makeRecurring(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
  return {
    id: TEST_RECURRING_ID,
    userId: TEST_USER_ID,
    accountId: TEST_ACCOUNT_ID,
    categoryId: null,
    name: 'Monthly Rent',
    description: null,
    amountType: 'fixed',
    amount: '5000.00',
    amountMax: null,
    frequency: 'monthly',
    dayOfMonth: 1,
    dayOfWeek: null,
    startDate: '2025-01-01',
    nextOccurrence: '2025-02-01',
    lastOccurrence: null,
    transactionType: 'debit',
    isActive: true,
    requiresConfirmation: false,
    merchantPattern: null,
    createdAt: new Date(),
    updatedAt: new Date(),
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
    id: '55555555-5555-5555-5555-555555555555',
    userId: TEST_USER_ID,
    accountId: TEST_ACCOUNT_ID,
    categoryId: null,
    amount: '5000.00',
    currency: 'ZAR',
    transactionDate: '2025-02-01',
    postedDate: null,
    description: 'Monthly Rent',
    merchantOriginal: null,
    merchantNormalized: null,
    notes: null,
    transactionType: 'debit',
    source: 'recurring',
    externalId: null,
    isRecurringInstance: true,
    recurringId: TEST_RECURRING_ID,
    transferPairId: null,
    transferToAccountId: null,
    isSplit: false,
    parentTransactionId: null,
    categorizationConfidence: null,
    categorizationMethod: null,
    isAiCategorized: false,
    isReviewed: true,
    importId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('recurringTransactionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns active recurring transactions for user', async () => {
      const items = [makeRecurring()]
      vi.mocked(recurringTransactionsRepository.findByUserId).mockResolvedValue(items)

      const result = await recurringTransactionsService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual(items)
      expect(recurringTransactionsRepository.findByUserId).toHaveBeenCalledWith(
        mockDb, TEST_USER_ID,
      )
    })
  })

  describe('listAll', () => {
    it('returns all recurring transactions including inactive', async () => {
      const items = [makeRecurring(), makeRecurring({ isActive: false })]
      vi.mocked(recurringTransactionsRepository.findAllByUserId).mockResolvedValue(items)

      const result = await recurringTransactionsService.listAll(mockDb, TEST_USER_ID)

      expect(result).toHaveLength(2)
      expect(recurringTransactionsRepository.findAllByUserId).toHaveBeenCalledWith(
        mockDb, TEST_USER_ID,
      )
    })
  })

  describe('getById', () => {
    it('returns recurring transaction when found', async () => {
      const recurring = makeRecurring()
      vi.mocked(recurringTransactionsRepository.findById).mockResolvedValue(recurring)

      const result = await recurringTransactionsService.getById(mockDb, TEST_RECURRING_ID, TEST_USER_ID)

      expect(result).toEqual(recurring)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(recurringTransactionsRepository.findById).mockResolvedValue(undefined)

      await expect(
        recurringTransactionsService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates a fixed monthly recurring transaction', async () => {
      const account = makeAccount()
      const recurring = makeRecurring()
      vi.mocked(accountsRepository.findById).mockResolvedValue(account)
      vi.mocked(recurringTransactionsRepository.create).mockResolvedValue(recurring)

      const result = await recurringTransactionsService.create(mockDb, TEST_USER_ID, {
        accountId: TEST_ACCOUNT_ID,
        name: 'Monthly Rent',
        amountType: 'fixed',
        amount: '5000.00',
        frequency: 'monthly',
        dayOfMonth: 1,
        startDate: '2025-01-01',
        transactionType: 'debit',
      })

      expect(result).toEqual(recurring)
      expect(recurringTransactionsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          accountId: TEST_ACCOUNT_ID,
          name: 'Monthly Rent',
          amountType: 'fixed',
          amount: '5000.00',
          frequency: 'monthly',
          dayOfMonth: 1,
          transactionType: 'debit',
        }),
      )
    })

    it('computes nextOccurrence from startDate', async () => {
      const account = makeAccount()
      const recurring = makeRecurring()
      vi.mocked(accountsRepository.findById).mockResolvedValue(account)
      vi.mocked(recurringTransactionsRepository.create).mockResolvedValue(recurring)

      await recurringTransactionsService.create(mockDb, TEST_USER_ID, {
        accountId: TEST_ACCOUNT_ID,
        name: 'Weekly Gym',
        amountType: 'fixed',
        amount: '200.00',
        frequency: 'weekly',
        dayOfWeek: 1,
        startDate: '2025-01-06',
        transactionType: 'debit',
      })

      expect(recurringTransactionsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          nextOccurrence: '2025-01-13',
        }),
      )
    })

    it('auto-sets requiresConfirmation for variable amount types', async () => {
      const account = makeAccount()
      const recurring = makeRecurring({ amountType: 'variable', requiresConfirmation: true })
      vi.mocked(accountsRepository.findById).mockResolvedValue(account)
      vi.mocked(recurringTransactionsRepository.create).mockResolvedValue(recurring)

      await recurringTransactionsService.create(mockDb, TEST_USER_ID, {
        accountId: TEST_ACCOUNT_ID,
        name: 'Electricity',
        amountType: 'variable',
        amountMax: '2000.00',
        frequency: 'monthly',
        dayOfMonth: 15,
        startDate: '2025-01-15',
        transactionType: 'debit',
      })

      expect(recurringTransactionsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          requiresConfirmation: true,
        }),
      )
    })

    it('throws NotFoundError when account does not exist', async () => {
      vi.mocked(accountsRepository.findById).mockResolvedValue(undefined)

      await expect(
        recurringTransactionsService.create(mockDb, TEST_USER_ID, {
          accountId: '99999999-9999-9999-9999-999999999999',
          name: 'Rent',
          amountType: 'fixed',
          amount: '5000.00',
          frequency: 'monthly',
          dayOfMonth: 1,
          startDate: '2025-01-01',
          transactionType: 'debit',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError for fixed type without amount', async () => {
      await expect(
        recurringTransactionsService.create(mockDb, TEST_USER_ID, {
          accountId: TEST_ACCOUNT_ID,
          name: 'Rent',
          amountType: 'fixed',
          frequency: 'monthly',
          dayOfMonth: 1,
          startDate: '2025-01-01',
          transactionType: 'debit',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for variable type without amountMax', async () => {
      await expect(
        recurringTransactionsService.create(mockDb, TEST_USER_ID, {
          accountId: TEST_ACCOUNT_ID,
          name: 'Electricity',
          amountType: 'variable',
          frequency: 'monthly',
          dayOfMonth: 15,
          startDate: '2025-01-15',
          transactionType: 'debit',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for monthly frequency without dayOfMonth', async () => {
      await expect(
        recurringTransactionsService.create(mockDb, TEST_USER_ID, {
          accountId: TEST_ACCOUNT_ID,
          name: 'Rent',
          amountType: 'fixed',
          amount: '5000.00',
          frequency: 'monthly',
          startDate: '2025-01-01',
          transactionType: 'debit',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for weekly frequency without dayOfWeek', async () => {
      await expect(
        recurringTransactionsService.create(mockDb, TEST_USER_ID, {
          accountId: TEST_ACCOUNT_ID,
          name: 'Gym',
          amountType: 'fixed',
          amount: '200.00',
          frequency: 'weekly',
          startDate: '2025-01-06',
          transactionType: 'debit',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for missing name', async () => {
      await expect(
        recurringTransactionsService.create(mockDb, TEST_USER_ID, {
          accountId: TEST_ACCOUNT_ID,
          name: '',
          amountType: 'fixed',
          amount: '100.00',
          frequency: 'monthly',
          dayOfMonth: 1,
          startDate: '2025-01-01',
          transactionType: 'debit',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('update', () => {
    it('updates recurring transaction fields', async () => {
      const existing = makeRecurring()
      const updated = makeRecurring({ name: 'Updated Rent' })
      vi.mocked(recurringTransactionsRepository.findById).mockResolvedValue(existing)
      vi.mocked(recurringTransactionsRepository.update).mockResolvedValue(updated)

      const result = await recurringTransactionsService.update(
        mockDb, TEST_RECURRING_ID, TEST_USER_ID, { name: 'Updated Rent' },
      )

      expect(result.name).toBe('Updated Rent')
    })

    it('throws NotFoundError when recurring transaction does not exist', async () => {
      vi.mocked(recurringTransactionsRepository.findById).mockResolvedValue(undefined)

      await expect(
        recurringTransactionsService.update(mockDb, 'nonexistent', TEST_USER_ID, {
          name: 'Updated',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        recurringTransactionsService.update(mockDb, TEST_RECURRING_ID, TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })

    it('can deactivate a recurring transaction', async () => {
      const existing = makeRecurring()
      const updated = makeRecurring({ isActive: false })
      vi.mocked(recurringTransactionsRepository.findById).mockResolvedValue(existing)
      vi.mocked(recurringTransactionsRepository.update).mockResolvedValue(updated)

      const result = await recurringTransactionsService.update(
        mockDb, TEST_RECURRING_ID, TEST_USER_ID, { isActive: false },
      )

      expect(result.isActive).toBe(false)
    })
  })

  describe('delete', () => {
    it('deletes a recurring transaction', async () => {
      vi.mocked(recurringTransactionsRepository.delete).mockResolvedValue(true)

      await expect(
        recurringTransactionsService.delete(mockDb, TEST_RECURRING_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()

      expect(recurringTransactionsRepository.delete).toHaveBeenCalledWith(
        mockDb, TEST_RECURRING_ID, TEST_USER_ID,
      )
    })

    it('throws NotFoundError when recurring transaction does not exist', async () => {
      vi.mocked(recurringTransactionsRepository.delete).mockResolvedValue(false)

      await expect(
        recurringTransactionsService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('getDue', () => {
    it('returns recurring transactions due as of given date', async () => {
      const dueItems = [makeRecurring({ nextOccurrence: '2025-02-01' })]
      vi.mocked(recurringTransactionsRepository.findDue).mockResolvedValue(dueItems)

      const result = await recurringTransactionsService.getDue(mockDb, TEST_USER_ID, '2025-02-01')

      expect(result).toEqual(dueItems)
      expect(recurringTransactionsRepository.findDue).toHaveBeenCalledWith(
        mockDb, TEST_USER_ID, '2025-02-01',
      )
    })
  })

  describe('generateInstance', () => {
    it('creates a transaction from recurring template and adjusts balance', async () => {
      const recurring = makeRecurring()
      const transaction = makeTransaction()
      vi.mocked(recurringTransactionsRepository.findById).mockResolvedValue(recurring)
      vi.mocked(transactionsRepository.create).mockResolvedValue(transaction)
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())
      vi.mocked(recurringTransactionsRepository.update).mockResolvedValue(
        makeRecurring({ nextOccurrence: '2025-03-01', lastOccurrence: '2025-02-01' }),
      )

      const result = await recurringTransactionsService.generateInstance(
        mockDb, TEST_RECURRING_ID, TEST_USER_ID, '5000.00',
      )

      expect(result).toEqual(transaction)
      expect(transactionsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          accountId: TEST_ACCOUNT_ID,
          amount: '5000.00',
          source: 'recurring',
          isRecurringInstance: true,
          recurringId: TEST_RECURRING_ID,
        }),
      )
    })

    it('subtracts balance for debit recurring transactions', async () => {
      const recurring = makeRecurring({ transactionType: 'debit' })
      vi.mocked(recurringTransactionsRepository.findById).mockResolvedValue(recurring)
      vi.mocked(transactionsRepository.create).mockResolvedValue(makeTransaction())
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())
      vi.mocked(recurringTransactionsRepository.update).mockResolvedValue(makeRecurring())

      await recurringTransactionsService.generateInstance(
        mockDb, TEST_RECURRING_ID, TEST_USER_ID, '5000.00',
      )

      expect(accountsRepository.adjustBalance).toHaveBeenCalledWith(
        mockDb, TEST_ACCOUNT_ID, TEST_USER_ID, '-5000.00',
      )
    })

    it('adds balance for credit recurring transactions', async () => {
      const recurring = makeRecurring({ transactionType: 'credit' })
      vi.mocked(recurringTransactionsRepository.findById).mockResolvedValue(recurring)
      vi.mocked(transactionsRepository.create).mockResolvedValue(makeTransaction({ transactionType: 'credit' }))
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())
      vi.mocked(recurringTransactionsRepository.update).mockResolvedValue(makeRecurring())

      await recurringTransactionsService.generateInstance(
        mockDb, TEST_RECURRING_ID, TEST_USER_ID, '3000.00',
      )

      expect(accountsRepository.adjustBalance).toHaveBeenCalledWith(
        mockDb, TEST_ACCOUNT_ID, TEST_USER_ID, '3000.00',
      )
    })

    it('advances nextOccurrence after generating instance', async () => {
      const recurring = makeRecurring({ nextOccurrence: '2025-02-01', frequency: 'monthly', dayOfMonth: 1 })
      vi.mocked(recurringTransactionsRepository.findById).mockResolvedValue(recurring)
      vi.mocked(transactionsRepository.create).mockResolvedValue(makeTransaction())
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())
      vi.mocked(recurringTransactionsRepository.update).mockResolvedValue(makeRecurring())

      await recurringTransactionsService.generateInstance(
        mockDb, TEST_RECURRING_ID, TEST_USER_ID, '5000.00',
      )

      expect(recurringTransactionsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_RECURRING_ID, TEST_USER_ID,
        expect.objectContaining({
          lastOccurrence: '2025-02-01',
          nextOccurrence: '2025-03-01',
        }),
      )
    })

    it('throws NotFoundError when recurring transaction does not exist', async () => {
      vi.mocked(recurringTransactionsRepository.findById).mockResolvedValue(undefined)

      await expect(
        recurringTransactionsService.generateInstance(mockDb, 'nonexistent', TEST_USER_ID, '100.00'),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no next occurrence', async () => {
      const recurring = makeRecurring({ nextOccurrence: null })
      vi.mocked(recurringTransactionsRepository.findById).mockResolvedValue(recurring)

      await expect(
        recurringTransactionsService.generateInstance(mockDb, TEST_RECURRING_ID, TEST_USER_ID, '100.00'),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('skip', () => {
    it('advances nextOccurrence without creating a transaction', async () => {
      const recurring = makeRecurring({ nextOccurrence: '2025-02-01', frequency: 'monthly', dayOfMonth: 1 })
      const updated = makeRecurring({ nextOccurrence: '2025-03-01' })
      vi.mocked(recurringTransactionsRepository.findById).mockResolvedValue(recurring)
      vi.mocked(recurringTransactionsRepository.update).mockResolvedValue(updated)

      const result = await recurringTransactionsService.skip(mockDb, TEST_RECURRING_ID, TEST_USER_ID)

      expect(result.nextOccurrence).toBe('2025-03-01')
      expect(transactionsRepository.create).not.toHaveBeenCalled()
      expect(accountsRepository.adjustBalance).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when recurring transaction does not exist', async () => {
      vi.mocked(recurringTransactionsRepository.findById).mockResolvedValue(undefined)

      await expect(
        recurringTransactionsService.skip(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no next occurrence', async () => {
      const recurring = makeRecurring({ nextOccurrence: null })
      vi.mocked(recurringTransactionsRepository.findById).mockResolvedValue(recurring)

      await expect(
        recurringTransactionsService.skip(mockDb, TEST_RECURRING_ID, TEST_USER_ID),
      ).rejects.toThrow(ValidationError)
    })
  })
})
