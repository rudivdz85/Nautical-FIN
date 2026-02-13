import { describe, it, expect, vi, beforeEach } from 'vitest'
import { incomesService } from '../../../packages/core/src/services/incomes.service'
import { incomesRepository } from '../../../packages/core/src/repositories/incomes.repository'
import { accountsRepository } from '../../../packages/core/src/repositories/accounts.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { Income } from '../../../packages/core/src/types/incomes'
import type { Account } from '../../../packages/core/src/types/accounts'

vi.mock('../../../packages/core/src/repositories/incomes.repository', () => ({
  incomesRepository: {
    findByUserId: vi.fn(),
    findAllByUserId: vi.fn(),
    findById: vi.fn(),
    findPrimarySalary: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/accounts.repository', () => ({
  accountsRepository: {
    findById: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof incomesService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_ACCOUNT_ID = '22222222-2222-2222-2222-222222222222'
const TEST_INCOME_ID = '33333333-3333-3333-3333-333333333333'

function makeIncome(overrides: Partial<Income> = {}): Income {
  return {
    id: TEST_INCOME_ID,
    userId: TEST_USER_ID,
    accountId: TEST_ACCOUNT_ID,
    recurringId: null,
    name: 'Salary',
    amount: '25000.00',
    frequency: 'monthly',
    expectedDay: 25,
    isConfirmed: true,
    confirmationRequiredMonthly: false,
    nextExpected: '2025-02-25',
    lastReceived: null,
    isPrimarySalary: true,
    isActive: true,
    notes: null,
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

describe('incomesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns active incomes for user', async () => {
      const incomes = [makeIncome()]
      vi.mocked(incomesRepository.findByUserId).mockResolvedValue(incomes)

      const result = await incomesService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual(incomes)
    })
  })

  describe('listAll', () => {
    it('returns all incomes including inactive', async () => {
      const incomes = [makeIncome(), makeIncome({ isActive: false })]
      vi.mocked(incomesRepository.findAllByUserId).mockResolvedValue(incomes)

      const result = await incomesService.listAll(mockDb, TEST_USER_ID)

      expect(result).toHaveLength(2)
    })
  })

  describe('getById', () => {
    it('returns income when found', async () => {
      const income = makeIncome()
      vi.mocked(incomesRepository.findById).mockResolvedValue(income)

      const result = await incomesService.getById(mockDb, TEST_INCOME_ID, TEST_USER_ID)

      expect(result).toEqual(income)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(incomesRepository.findById).mockResolvedValue(undefined)

      await expect(
        incomesService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates a monthly income', async () => {
      const income = makeIncome()
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(incomesRepository.findPrimarySalary).mockResolvedValue(undefined)
      vi.mocked(incomesRepository.create).mockResolvedValue(income)

      const result = await incomesService.create(mockDb, TEST_USER_ID, {
        accountId: TEST_ACCOUNT_ID,
        name: 'Salary',
        amount: '25000.00',
        frequency: 'monthly',
        expectedDay: 25,
        isPrimarySalary: true,
      })

      expect(result).toEqual(income)
      expect(incomesRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          accountId: TEST_ACCOUNT_ID,
          name: 'Salary',
          amount: '25000.00',
          frequency: 'monthly',
          expectedDay: 25,
          isPrimarySalary: true,
        }),
      )
    })

    it('computes nextExpected on creation', async () => {
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(incomesRepository.findPrimarySalary).mockResolvedValue(undefined)
      vi.mocked(incomesRepository.create).mockResolvedValue(makeIncome())

      await incomesService.create(mockDb, TEST_USER_ID, {
        accountId: TEST_ACCOUNT_ID,
        name: 'Salary',
        amount: '25000.00',
        frequency: 'monthly',
        expectedDay: 25,
      })

      expect(incomesRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          nextExpected: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
    })

    it('clears existing primary salary when setting new one', async () => {
      const existingPrimary = makeIncome({ id: 'old-primary' })
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(incomesRepository.findPrimarySalary).mockResolvedValue(existingPrimary)
      vi.mocked(incomesRepository.update).mockResolvedValue(makeIncome({ isPrimarySalary: false }))
      vi.mocked(incomesRepository.create).mockResolvedValue(makeIncome())

      await incomesService.create(mockDb, TEST_USER_ID, {
        accountId: TEST_ACCOUNT_ID,
        name: 'New Salary',
        amount: '30000.00',
        frequency: 'monthly',
        expectedDay: 25,
        isPrimarySalary: true,
      })

      expect(incomesRepository.update).toHaveBeenCalledWith(
        mockDb, 'old-primary', TEST_USER_ID, { isPrimarySalary: false },
      )
    })

    it('throws NotFoundError when account does not exist', async () => {
      vi.mocked(accountsRepository.findById).mockResolvedValue(undefined)

      await expect(
        incomesService.create(mockDb, TEST_USER_ID, {
          accountId: '99999999-9999-9999-9999-999999999999',
          name: 'Salary',
          amount: '25000.00',
          frequency: 'monthly',
          expectedDay: 25,
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError for monthly frequency without expectedDay', async () => {
      await expect(
        incomesService.create(mockDb, TEST_USER_ID, {
          accountId: TEST_ACCOUNT_ID,
          name: 'Salary',
          amount: '25000.00',
          frequency: 'monthly',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for empty name', async () => {
      await expect(
        incomesService.create(mockDb, TEST_USER_ID, {
          accountId: TEST_ACCOUNT_ID,
          name: '',
          amount: '25000.00',
          frequency: 'monthly',
          expectedDay: 25,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid amount format', async () => {
      await expect(
        incomesService.create(mockDb, TEST_USER_ID, {
          accountId: TEST_ACCOUNT_ID,
          name: 'Salary',
          amount: 'abc',
          frequency: 'monthly',
          expectedDay: 25,
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('update', () => {
    it('updates income fields', async () => {
      const existing = makeIncome()
      const updated = makeIncome({ amount: '30000.00' })
      vi.mocked(incomesRepository.findById).mockResolvedValue(existing)
      vi.mocked(incomesRepository.update).mockResolvedValue(updated)

      const result = await incomesService.update(mockDb, TEST_INCOME_ID, TEST_USER_ID, {
        amount: '30000.00',
      })

      expect(result.amount).toBe('30000.00')
    })

    it('clears existing primary when updating another to primary', async () => {
      const existing = makeIncome({ isPrimarySalary: false })
      const otherPrimary = makeIncome({ id: 'other-primary', isPrimarySalary: true })
      vi.mocked(incomesRepository.findById).mockResolvedValue(existing)
      vi.mocked(incomesRepository.findPrimarySalary).mockResolvedValue(otherPrimary)
      vi.mocked(incomesRepository.update)
        .mockResolvedValueOnce(makeIncome({ id: 'other-primary', isPrimarySalary: false }))
        .mockResolvedValueOnce(makeIncome({ isPrimarySalary: true }))

      await incomesService.update(mockDb, TEST_INCOME_ID, TEST_USER_ID, {
        isPrimarySalary: true,
      })

      expect(incomesRepository.update).toHaveBeenCalledWith(
        mockDb, 'other-primary', TEST_USER_ID, { isPrimarySalary: false },
      )
    })

    it('does not clear primary if already the same income', async () => {
      const existing = makeIncome({ isPrimarySalary: true })
      vi.mocked(incomesRepository.findById).mockResolvedValue(existing)
      vi.mocked(incomesRepository.findPrimarySalary).mockResolvedValue(existing)
      vi.mocked(incomesRepository.update).mockResolvedValue(makeIncome({ isPrimarySalary: true }))

      await incomesService.update(mockDb, TEST_INCOME_ID, TEST_USER_ID, {
        isPrimarySalary: true,
      })

      // update should only be called once (for the actual update, not to clear itself)
      expect(incomesRepository.update).toHaveBeenCalledTimes(1)
    })

    it('throws NotFoundError when income does not exist', async () => {
      vi.mocked(incomesRepository.findById).mockResolvedValue(undefined)

      await expect(
        incomesService.update(mockDb, 'nonexistent', TEST_USER_ID, { name: 'Updated' }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        incomesService.update(mockDb, TEST_INCOME_ID, TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })

    it('can deactivate an income', async () => {
      const existing = makeIncome()
      const updated = makeIncome({ isActive: false })
      vi.mocked(incomesRepository.findById).mockResolvedValue(existing)
      vi.mocked(incomesRepository.update).mockResolvedValue(updated)

      const result = await incomesService.update(mockDb, TEST_INCOME_ID, TEST_USER_ID, {
        isActive: false,
      })

      expect(result.isActive).toBe(false)
    })
  })

  describe('delete', () => {
    it('deletes an income', async () => {
      vi.mocked(incomesRepository.delete).mockResolvedValue(true)

      await expect(
        incomesService.delete(mockDb, TEST_INCOME_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when income does not exist', async () => {
      vi.mocked(incomesRepository.delete).mockResolvedValue(false)

      await expect(
        incomesService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('confirm', () => {
    it('confirms income receipt and advances nextExpected', async () => {
      const income = makeIncome({ nextExpected: '2025-01-25' })
      const confirmed = makeIncome({
        isConfirmed: true,
        lastReceived: '2025-01-25',
        nextExpected: '2025-02-25',
      })
      vi.mocked(incomesRepository.findById).mockResolvedValue(income)
      vi.mocked(incomesRepository.update).mockResolvedValue(confirmed)

      const result = await incomesService.confirm(
        mockDb, TEST_INCOME_ID, TEST_USER_ID, '2025-01-25',
      )

      expect(result.isConfirmed).toBe(true)
      expect(result.lastReceived).toBe('2025-01-25')
      expect(incomesRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_INCOME_ID, TEST_USER_ID,
        expect.objectContaining({
          isConfirmed: true,
          lastReceived: '2025-01-25',
          nextExpected: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
    })

    it('throws NotFoundError when income does not exist', async () => {
      vi.mocked(incomesRepository.findById).mockResolvedValue(undefined)

      await expect(
        incomesService.confirm(mockDb, 'nonexistent', TEST_USER_ID, '2025-01-25'),
      ).rejects.toThrow(NotFoundError)
    })
  })
})
