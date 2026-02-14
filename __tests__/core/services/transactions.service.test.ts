import { describe, it, expect, vi, beforeEach } from 'vitest'
import { transactionsService } from '../../../packages/core/src/services/transactions.service'
import { transactionsRepository } from '../../../packages/core/src/repositories/transactions.repository'
import { accountsRepository } from '../../../packages/core/src/repositories/accounts.repository'
import { categoriesRepository } from '../../../packages/core/src/repositories/categories.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { Transaction } from '../../../packages/core/src/types/transactions'
import type { Account } from '../../../packages/core/src/types/accounts'
import type { Category } from '../../../packages/core/src/types/categories'

vi.mock('../../../packages/core/src/repositories/transactions.repository', () => ({
  transactionsRepository: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    findByTransferPairId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteByTransferPairId: vi.fn(),
    bulkUpdateCategory: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/accounts.repository', () => ({
  accountsRepository: {
    findById: vi.fn(),
    adjustBalance: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/categories.repository', () => ({
  categoriesRepository: { findByIdAndUserId: vi.fn() },
}))

const mockDb = {} as Parameters<typeof transactionsService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_ACCOUNT_ID = '22222222-2222-2222-2222-222222222222'
const TEST_ACCOUNT_ID_2 = '33333333-3333-3333-3333-333333333333'
const TEST_CATEGORY_ID = '66666666-6666-6666-6666-666666666666'

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
    description: 'Test Transaction',
    merchantOriginal: null,
    merchantNormalized: null,
    notes: null,
    transactionType: 'debit',
    source: 'manual',
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
    isReviewed: true,
    importId: null,
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
    currentBalance: '1000.00',
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

describe('transactionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns transactions for user', async () => {
      const txns = [makeTransaction()]
      vi.mocked(transactionsRepository.findByUserId).mockResolvedValue(txns)

      const result = await transactionsService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual(txns)
      expect(transactionsRepository.findByUserId).toHaveBeenCalledWith(
        mockDb, TEST_USER_ID, {},
      )
    })

    it('passes filters through', async () => {
      vi.mocked(transactionsRepository.findByUserId).mockResolvedValue([])

      await transactionsService.list(mockDb, TEST_USER_ID, {
        accountId: TEST_ACCOUNT_ID,
        transactionType: 'debit',
      })

      expect(transactionsRepository.findByUserId).toHaveBeenCalledWith(
        mockDb,
        TEST_USER_ID,
        { accountId: TEST_ACCOUNT_ID, transactionType: 'debit' },
      )
    })
  })

  describe('getById', () => {
    it('returns transaction when found', async () => {
      const txn = makeTransaction()
      vi.mocked(transactionsRepository.findById).mockResolvedValue(txn)

      const result = await transactionsService.getById(mockDb, txn.id, TEST_USER_ID)

      expect(result).toEqual(txn)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(transactionsRepository.findById).mockResolvedValue(undefined)

      await expect(
        transactionsService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates a debit transaction and decreases account balance', async () => {
      const account = makeAccount()
      const txn = makeTransaction()
      vi.mocked(accountsRepository.findById).mockResolvedValue(account)
      vi.mocked(transactionsRepository.create).mockResolvedValue(txn)
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(account)

      const result = await transactionsService.create(mockDb, TEST_USER_ID, {
        accountId: TEST_ACCOUNT_ID,
        amount: '100.00',
        transactionDate: '2025-01-15',
        description: 'Groceries',
        transactionType: 'debit',
      })

      expect(result).toEqual(txn)
      expect(accountsRepository.adjustBalance).toHaveBeenCalledWith(
        mockDb, TEST_ACCOUNT_ID, TEST_USER_ID, '-100.00',
      )
    })

    it('creates a credit transaction and increases account balance', async () => {
      const account = makeAccount()
      const txn = makeTransaction({ transactionType: 'credit' })
      vi.mocked(accountsRepository.findById).mockResolvedValue(account)
      vi.mocked(transactionsRepository.create).mockResolvedValue(txn)
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(account)

      await transactionsService.create(mockDb, TEST_USER_ID, {
        accountId: TEST_ACCOUNT_ID,
        amount: '500.00',
        transactionDate: '2025-01-15',
        description: 'Salary',
        transactionType: 'credit',
      })

      expect(accountsRepository.adjustBalance).toHaveBeenCalledWith(
        mockDb, TEST_ACCOUNT_ID, TEST_USER_ID, '500.00',
      )
    })

    it('sets source to manual and isReviewed to true by default', async () => {
      const account = makeAccount()
      const txn = makeTransaction()
      vi.mocked(accountsRepository.findById).mockResolvedValue(account)
      vi.mocked(transactionsRepository.create).mockResolvedValue(txn)
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(account)

      await transactionsService.create(mockDb, TEST_USER_ID, {
        accountId: TEST_ACCOUNT_ID,
        amount: '50.00',
        transactionDate: '2025-01-15',
        description: 'Test',
        transactionType: 'debit',
      })

      expect(transactionsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          source: 'manual',
          isReviewed: true,
        }),
      )
    })

    it('rejects transfer type (must use createTransfer)', async () => {
      await expect(
        transactionsService.create(mockDb, TEST_USER_ID, {
          accountId: TEST_ACCOUNT_ID,
          amount: '100.00',
          transactionDate: '2025-01-15',
          description: 'Transfer',
          transactionType: 'transfer',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws NotFoundError when account does not exist', async () => {
      vi.mocked(accountsRepository.findById).mockResolvedValue(undefined)

      await expect(
        transactionsService.create(mockDb, TEST_USER_ID, {
          accountId: '99999999-9999-9999-9999-999999999999',
          amount: '100.00',
          transactionDate: '2025-01-15',
          description: 'Test',
          transactionType: 'debit',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError for missing description', async () => {
      await expect(
        transactionsService.create(mockDb, TEST_USER_ID, {
          accountId: TEST_ACCOUNT_ID,
          amount: '100.00',
          transactionDate: '2025-01-15',
          description: '',
          transactionType: 'debit',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid amount format', async () => {
      await expect(
        transactionsService.create(mockDb, TEST_USER_ID, {
          accountId: TEST_ACCOUNT_ID,
          amount: 'abc',
          transactionDate: '2025-01-15',
          description: 'Test',
          transactionType: 'debit',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('createTransfer', () => {
    it('creates paired debit and credit transactions', async () => {
      const fromAccount = makeAccount({ id: TEST_ACCOUNT_ID })
      const toAccount = makeAccount({ id: TEST_ACCOUNT_ID_2 })
      const debitTxn = makeTransaction({ transactionType: 'debit', transferPairId: 'pair-1' })
      const creditTxn = makeTransaction({
        id: '55555555-5555-5555-5555-555555555555',
        transactionType: 'credit',
        accountId: TEST_ACCOUNT_ID_2,
        transferPairId: 'pair-1',
      })

      vi.mocked(accountsRepository.findById)
        .mockResolvedValueOnce(fromAccount)
        .mockResolvedValueOnce(toAccount)
      vi.mocked(transactionsRepository.create)
        .mockResolvedValueOnce(debitTxn)
        .mockResolvedValueOnce(creditTxn)
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(fromAccount)

      const result = await transactionsService.createTransfer(mockDb, TEST_USER_ID, {
        fromAccountId: TEST_ACCOUNT_ID,
        toAccountId: TEST_ACCOUNT_ID_2,
        amount: '500.00',
        transactionDate: '2025-01-15',
        description: 'Transfer to savings',
      })

      expect(result.debit.transactionType).toBe('debit')
      expect(result.credit.transactionType).toBe('credit')
      expect(transactionsRepository.create).toHaveBeenCalledTimes(2)
    })

    it('adjusts balances on both accounts', async () => {
      const fromAccount = makeAccount({ id: TEST_ACCOUNT_ID })
      const toAccount = makeAccount({ id: TEST_ACCOUNT_ID_2 })
      vi.mocked(accountsRepository.findById)
        .mockResolvedValueOnce(fromAccount)
        .mockResolvedValueOnce(toAccount)
      vi.mocked(transactionsRepository.create)
        .mockResolvedValueOnce(makeTransaction())
        .mockResolvedValueOnce(makeTransaction())
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(fromAccount)

      await transactionsService.createTransfer(mockDb, TEST_USER_ID, {
        fromAccountId: TEST_ACCOUNT_ID,
        toAccountId: TEST_ACCOUNT_ID_2,
        amount: '500.00',
        transactionDate: '2025-01-15',
        description: 'Transfer',
      })

      expect(accountsRepository.adjustBalance).toHaveBeenCalledWith(
        mockDb, TEST_ACCOUNT_ID, TEST_USER_ID, '-500.00',
      )
      expect(accountsRepository.adjustBalance).toHaveBeenCalledWith(
        mockDb, TEST_ACCOUNT_ID_2, TEST_USER_ID, '500.00',
      )
    })

    it('rejects transfer to same account', async () => {
      await expect(
        transactionsService.createTransfer(mockDb, TEST_USER_ID, {
          fromAccountId: TEST_ACCOUNT_ID,
          toAccountId: TEST_ACCOUNT_ID,
          amount: '100.00',
          transactionDate: '2025-01-15',
          description: 'Self transfer',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws NotFoundError when source account does not exist', async () => {
      vi.mocked(accountsRepository.findById).mockResolvedValue(undefined)

      await expect(
        transactionsService.createTransfer(mockDb, TEST_USER_ID, {
          fromAccountId: '99999999-9999-9999-9999-999999999999',
          toAccountId: TEST_ACCOUNT_ID_2,
          amount: '100.00',
          transactionDate: '2025-01-15',
          description: 'Transfer',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when destination account does not exist', async () => {
      vi.mocked(accountsRepository.findById)
        .mockResolvedValueOnce(makeAccount())
        .mockResolvedValueOnce(undefined)

      await expect(
        transactionsService.createTransfer(mockDb, TEST_USER_ID, {
          fromAccountId: TEST_ACCOUNT_ID,
          toAccountId: '99999999-9999-9999-9999-999999999999',
          amount: '100.00',
          transactionDate: '2025-01-15',
          description: 'Transfer',
        }),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('update', () => {
    it('updates transaction fields', async () => {
      const existing = makeTransaction()
      const updated = makeTransaction({ description: 'Updated' })
      vi.mocked(transactionsRepository.findById).mockResolvedValue(existing)
      vi.mocked(transactionsRepository.update).mockResolvedValue(updated)

      const result = await transactionsService.update(mockDb, existing.id, TEST_USER_ID, {
        description: 'Updated',
      })

      expect(result.description).toBe('Updated')
    })

    it('recalculates balance when amount changes', async () => {
      const existing = makeTransaction({ amount: '100.00', transactionType: 'debit' })
      const updated = makeTransaction({ amount: '200.00', transactionType: 'debit' })
      vi.mocked(transactionsRepository.findById).mockResolvedValue(existing)
      vi.mocked(transactionsRepository.update).mockResolvedValue(updated)
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())

      await transactionsService.update(mockDb, existing.id, TEST_USER_ID, {
        amount: '200.00',
      })

      // Reverse old: negate(-100.00) = 100.00
      expect(accountsRepository.adjustBalance).toHaveBeenCalledWith(
        mockDb, TEST_ACCOUNT_ID, TEST_USER_ID, '100.00',
      )
      // Apply new: -200.00
      expect(accountsRepository.adjustBalance).toHaveBeenCalledWith(
        mockDb, TEST_ACCOUNT_ID, TEST_USER_ID, '-200.00',
      )
    })

    it('does not adjust balance when amount unchanged', async () => {
      const existing = makeTransaction({ amount: '100.00' })
      const updated = makeTransaction({ description: 'Changed' })
      vi.mocked(transactionsRepository.findById).mockResolvedValue(existing)
      vi.mocked(transactionsRepository.update).mockResolvedValue(updated)

      await transactionsService.update(mockDb, existing.id, TEST_USER_ID, {
        description: 'Changed',
      })

      expect(accountsRepository.adjustBalance).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when transaction does not exist', async () => {
      vi.mocked(transactionsRepository.findById).mockResolvedValue(undefined)

      await expect(
        transactionsService.update(mockDb, 'nonexistent', TEST_USER_ID, {
          description: 'X',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        transactionsService.update(mockDb, 'some-id', TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('delete', () => {
    it('deletes transaction and reverses balance (debit)', async () => {
      const txn = makeTransaction({ transactionType: 'debit', amount: '100.00' })
      vi.mocked(transactionsRepository.findById).mockResolvedValue(txn)
      vi.mocked(transactionsRepository.delete).mockResolvedValue(true)
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())

      await transactionsService.delete(mockDb, txn.id, TEST_USER_ID)

      // Reverse debit: negate(-100.00) = 100.00
      expect(accountsRepository.adjustBalance).toHaveBeenCalledWith(
        mockDb, TEST_ACCOUNT_ID, TEST_USER_ID, '100.00',
      )
      expect(transactionsRepository.delete).toHaveBeenCalledWith(
        mockDb, txn.id, TEST_USER_ID,
      )
    })

    it('deletes transaction and reverses balance (credit)', async () => {
      const txn = makeTransaction({ transactionType: 'credit', amount: '500.00' })
      vi.mocked(transactionsRepository.findById).mockResolvedValue(txn)
      vi.mocked(transactionsRepository.delete).mockResolvedValue(true)
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())

      await transactionsService.delete(mockDb, txn.id, TEST_USER_ID)

      // Reverse credit: negate(500.00) = -500.00
      expect(accountsRepository.adjustBalance).toHaveBeenCalledWith(
        mockDb, TEST_ACCOUNT_ID, TEST_USER_ID, '-500.00',
      )
    })

    it('deletes both sides of a transfer', async () => {
      const pairId = 'pair-123'
      const debitTxn = makeTransaction({
        transactionType: 'debit',
        amount: '200.00',
        transferPairId: pairId,
        accountId: TEST_ACCOUNT_ID,
      })
      const creditTxn = makeTransaction({
        id: '55555555-5555-5555-5555-555555555555',
        transactionType: 'credit',
        amount: '200.00',
        transferPairId: pairId,
        accountId: TEST_ACCOUNT_ID_2,
      })

      vi.mocked(transactionsRepository.findById).mockResolvedValue(debitTxn)
      vi.mocked(transactionsRepository.findByTransferPairId).mockResolvedValue([
        debitTxn,
        creditTxn,
      ])
      vi.mocked(transactionsRepository.deleteByTransferPairId).mockResolvedValue(2)
      vi.mocked(accountsRepository.adjustBalance).mockResolvedValue(makeAccount())

      await transactionsService.delete(mockDb, debitTxn.id, TEST_USER_ID)

      // Reverse debit side: 100.00 back
      expect(accountsRepository.adjustBalance).toHaveBeenCalledWith(
        mockDb, TEST_ACCOUNT_ID, TEST_USER_ID, '200.00',
      )
      // Reverse credit side: -200.00 back
      expect(accountsRepository.adjustBalance).toHaveBeenCalledWith(
        mockDb, TEST_ACCOUNT_ID_2, TEST_USER_ID, '-200.00',
      )
      expect(transactionsRepository.deleteByTransferPairId).toHaveBeenCalledWith(
        mockDb, pairId,
      )
    })

    it('throws NotFoundError when transaction does not exist', async () => {
      vi.mocked(transactionsRepository.findById).mockResolvedValue(undefined)

      await expect(
        transactionsService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('bulkCategorize', () => {
    const makeCategory = (overrides: Partial<Category> = {}): Category => ({
      id: TEST_CATEGORY_ID,
      userId: TEST_USER_ID,
      name: 'Groceries',
      type: 'expense',
      icon: null,
      color: null,
      isDefault: false,
      isActive: true,
      displayOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    })

    it('updates category for multiple transactions', async () => {
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(makeCategory())
      vi.mocked(transactionsRepository.bulkUpdateCategory).mockResolvedValue(3)

      const txnIds = [
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
      ]
      const result = await transactionsService.bulkCategorize(mockDb, TEST_USER_ID, {
        transactionIds: txnIds,
        categoryId: TEST_CATEGORY_ID,
      })

      expect(result.updated).toBe(3)
      expect(transactionsRepository.bulkUpdateCategory).toHaveBeenCalledWith(
        mockDb, txnIds, TEST_USER_ID, TEST_CATEGORY_ID,
      )
    })

    it('throws NotFoundError when category does not exist', async () => {
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(undefined)

      await expect(
        transactionsService.bulkCategorize(mockDb, TEST_USER_ID, {
          transactionIds: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
          categoryId: '99999999-9999-9999-9999-999999999999',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError for empty transaction IDs', async () => {
      await expect(
        transactionsService.bulkCategorize(mockDb, TEST_USER_ID, {
          transactionIds: [],
          categoryId: TEST_CATEGORY_ID,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid category ID format', async () => {
      await expect(
        transactionsService.bulkCategorize(mockDb, TEST_USER_ID, {
          transactionIds: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
          categoryId: 'not-a-uuid',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })
})
