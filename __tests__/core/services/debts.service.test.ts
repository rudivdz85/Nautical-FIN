import { describe, it, expect, vi, beforeEach } from 'vitest'
import { debtsService } from '../../../packages/core/src/services/debts.service'
import { debtsRepository } from '../../../packages/core/src/repositories/debts.repository'
import { debtPaymentsRepository } from '../../../packages/core/src/repositories/debt-payments.repository'
import { accountsRepository } from '../../../packages/core/src/repositories/accounts.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { Debt, DebtPayment } from '../../../packages/core/src/types/debts'
import type { Account } from '../../../packages/core/src/types/accounts'

vi.mock('../../../packages/core/src/repositories/debts.repository', () => ({
  debtsRepository: {
    findByUserId: vi.fn(),
    findAllByUserId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/debt-payments.repository', () => ({
  debtPaymentsRepository: {
    findByDebtId: vi.fn(),
    findById: vi.fn(),
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

const mockDb = {} as Parameters<typeof debtsService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_ACCOUNT_ID = '22222222-2222-2222-2222-222222222222'
const TEST_DEBT_ID = '33333333-3333-3333-3333-333333333333'
const TEST_PAYMENT_ID = '44444444-4444-4444-4444-444444444444'

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: TEST_DEBT_ID,
    userId: TEST_USER_ID,
    linkedAccountId: null,
    name: 'Home Loan',
    debtType: 'home_loan',
    creditor: 'Bank',
    originalAmount: '1000000.00',
    currentBalance: '950000.00',
    interestRate: '10.50',
    interestType: 'compound',
    minimumPayment: '8500.00',
    fixedPayment: null,
    paymentDay: 1,
    startDate: '2023-01-01',
    expectedPayoffDate: '2043-01-01',
    isActive: true,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makePayment(overrides: Partial<DebtPayment> = {}): DebtPayment {
  return {
    id: TEST_PAYMENT_ID,
    debtId: TEST_DEBT_ID,
    transactionId: null,
    amount: '8500.00',
    principalAmount: '5000.00',
    interestAmount: '3500.00',
    paymentDate: '2025-02-01',
    balanceAfter: '941500.00',
    createdAt: new Date(),
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

describe('debtsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns active debts for user', async () => {
      const debts = [makeDebt()]
      vi.mocked(debtsRepository.findByUserId).mockResolvedValue(debts)

      const result = await debtsService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual(debts)
    })
  })

  describe('listAll', () => {
    it('returns all debts including inactive', async () => {
      const debts = [makeDebt(), makeDebt({ isActive: false })]
      vi.mocked(debtsRepository.findAllByUserId).mockResolvedValue(debts)

      const result = await debtsService.listAll(mockDb, TEST_USER_ID)

      expect(result).toHaveLength(2)
    })
  })

  describe('getById', () => {
    it('returns debt with payments', async () => {
      const debt = makeDebt()
      const payments = [makePayment()]
      vi.mocked(debtsRepository.findById).mockResolvedValue(debt)
      vi.mocked(debtPaymentsRepository.findByDebtId).mockResolvedValue(payments)

      const result = await debtsService.getById(mockDb, TEST_DEBT_ID, TEST_USER_ID)

      expect(result.id).toBe(TEST_DEBT_ID)
      expect(result.payments).toEqual(payments)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(debtsRepository.findById).mockResolvedValue(undefined)

      await expect(
        debtsService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates a debt', async () => {
      const debt = makeDebt()
      vi.mocked(debtsRepository.create).mockResolvedValue(debt)

      const result = await debtsService.create(mockDb, TEST_USER_ID, {
        name: 'Home Loan',
        debtType: 'home_loan',
        originalAmount: '1000000.00',
        currentBalance: '950000.00',
      })

      expect(result).toEqual(debt)
      expect(debtsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          name: 'Home Loan',
          debtType: 'home_loan',
          originalAmount: '1000000.00',
          currentBalance: '950000.00',
        }),
      )
    })

    it('validates linked account exists', async () => {
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(debtsRepository.create).mockResolvedValue(makeDebt({ linkedAccountId: TEST_ACCOUNT_ID }))

      await debtsService.create(mockDb, TEST_USER_ID, {
        name: 'Home Loan',
        debtType: 'home_loan',
        originalAmount: '1000000.00',
        currentBalance: '950000.00',
        linkedAccountId: TEST_ACCOUNT_ID,
      })

      expect(accountsRepository.findById).toHaveBeenCalledWith(mockDb, TEST_ACCOUNT_ID, TEST_USER_ID)
    })

    it('throws NotFoundError when linked account does not exist', async () => {
      vi.mocked(accountsRepository.findById).mockResolvedValue(undefined)

      await expect(
        debtsService.create(mockDb, TEST_USER_ID, {
          name: 'Home Loan',
          debtType: 'home_loan',
          originalAmount: '1000000.00',
          currentBalance: '950000.00',
          linkedAccountId: TEST_ACCOUNT_ID,
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError for empty name', async () => {
      await expect(
        debtsService.create(mockDb, TEST_USER_ID, {
          name: '',
          debtType: 'home_loan',
          originalAmount: '1000000.00',
          currentBalance: '950000.00',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid debt type', async () => {
      await expect(
        debtsService.create(mockDb, TEST_USER_ID, {
          name: 'Loan',
          debtType: 'invalid_type',
          originalAmount: '1000000.00',
          currentBalance: '950000.00',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid amount format', async () => {
      await expect(
        debtsService.create(mockDb, TEST_USER_ID, {
          name: 'Loan',
          debtType: 'home_loan',
          originalAmount: 'abc',
          currentBalance: '950000.00',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('update', () => {
    it('updates debt fields', async () => {
      const existing = makeDebt()
      const updated = makeDebt({ currentBalance: '940000.00' })
      vi.mocked(debtsRepository.findById).mockResolvedValue(existing)
      vi.mocked(debtsRepository.update).mockResolvedValue(updated)

      const result = await debtsService.update(mockDb, TEST_DEBT_ID, TEST_USER_ID, {
        currentBalance: '940000.00',
      })

      expect(result.currentBalance).toBe('940000.00')
    })

    it('validates linked account on update', async () => {
      const existing = makeDebt()
      vi.mocked(debtsRepository.findById).mockResolvedValue(existing)
      vi.mocked(accountsRepository.findById).mockResolvedValue(undefined)

      await expect(
        debtsService.update(mockDb, TEST_DEBT_ID, TEST_USER_ID, {
          linkedAccountId: TEST_ACCOUNT_ID,
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when debt does not exist', async () => {
      vi.mocked(debtsRepository.findById).mockResolvedValue(undefined)

      await expect(
        debtsService.update(mockDb, 'nonexistent', TEST_USER_ID, { name: 'Updated' }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        debtsService.update(mockDb, TEST_DEBT_ID, TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })

    it('can deactivate a debt', async () => {
      const existing = makeDebt()
      const updated = makeDebt({ isActive: false })
      vi.mocked(debtsRepository.findById).mockResolvedValue(existing)
      vi.mocked(debtsRepository.update).mockResolvedValue(updated)

      const result = await debtsService.update(mockDb, TEST_DEBT_ID, TEST_USER_ID, {
        isActive: false,
      })

      expect(result.isActive).toBe(false)
    })
  })

  describe('delete', () => {
    it('deletes a debt', async () => {
      vi.mocked(debtsRepository.delete).mockResolvedValue(true)

      await expect(
        debtsService.delete(mockDb, TEST_DEBT_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when debt does not exist', async () => {
      vi.mocked(debtsRepository.delete).mockResolvedValue(false)

      await expect(
        debtsService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('listPayments', () => {
    it('returns payments for a debt', async () => {
      const debt = makeDebt()
      const payments = [makePayment(), makePayment({ id: 'payment-2' })]
      vi.mocked(debtsRepository.findById).mockResolvedValue(debt)
      vi.mocked(debtPaymentsRepository.findByDebtId).mockResolvedValue(payments)

      const result = await debtsService.listPayments(mockDb, TEST_DEBT_ID, TEST_USER_ID)

      expect(result).toHaveLength(2)
    })

    it('throws NotFoundError when debt does not exist', async () => {
      vi.mocked(debtsRepository.findById).mockResolvedValue(undefined)

      await expect(
        debtsService.listPayments(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('addPayment', () => {
    it('creates payment and reduces debt balance', async () => {
      const debt = makeDebt({ currentBalance: '950000.00' })
      const payment = makePayment({ balanceAfter: '941500.00' })
      vi.mocked(debtsRepository.findById).mockResolvedValue(debt)
      vi.mocked(debtPaymentsRepository.create).mockResolvedValue(payment)
      vi.mocked(debtsRepository.update).mockResolvedValue(makeDebt({ currentBalance: '941500.00' }))

      const result = await debtsService.addPayment(mockDb, TEST_DEBT_ID, TEST_USER_ID, {
        amount: '8500.00',
        paymentDate: '2025-02-01',
      })

      expect(result).toEqual(payment)
      expect(debtPaymentsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          debtId: TEST_DEBT_ID,
          amount: '8500.00',
          balanceAfter: '941500.00',
        }),
      )
      expect(debtsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_DEBT_ID, TEST_USER_ID,
        { currentBalance: '941500.00' },
      )
    })

    it('includes principal and interest breakdown', async () => {
      const debt = makeDebt({ currentBalance: '950000.00' })
      vi.mocked(debtsRepository.findById).mockResolvedValue(debt)
      vi.mocked(debtPaymentsRepository.create).mockResolvedValue(makePayment())
      vi.mocked(debtsRepository.update).mockResolvedValue(makeDebt())

      await debtsService.addPayment(mockDb, TEST_DEBT_ID, TEST_USER_ID, {
        amount: '8500.00',
        principalAmount: '5000.00',
        interestAmount: '3500.00',
        paymentDate: '2025-02-01',
      })

      expect(debtPaymentsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          principalAmount: '5000.00',
          interestAmount: '3500.00',
        }),
      )
    })

    it('throws NotFoundError when debt does not exist', async () => {
      vi.mocked(debtsRepository.findById).mockResolvedValue(undefined)

      await expect(
        debtsService.addPayment(mockDb, 'nonexistent', TEST_USER_ID, {
          amount: '8500.00',
          paymentDate: '2025-02-01',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError for invalid payment data', async () => {
      await expect(
        debtsService.addPayment(mockDb, TEST_DEBT_ID, TEST_USER_ID, {
          amount: 'abc',
          paymentDate: '2025-02-01',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('updatePayment', () => {
    it('updates payment and adjusts debt balance when amount changes', async () => {
      const debt = makeDebt({ currentBalance: '941500.00' })
      const existing = makePayment({ amount: '8500.00' })
      const updated = makePayment({ amount: '10000.00' })
      vi.mocked(debtsRepository.findById).mockResolvedValue(debt)
      vi.mocked(debtPaymentsRepository.findById).mockResolvedValue(existing)
      vi.mocked(debtPaymentsRepository.update).mockResolvedValue(updated)
      vi.mocked(debtsRepository.update).mockResolvedValue(makeDebt({ currentBalance: '940000.00' }))

      const result = await debtsService.updatePayment(
        mockDb, TEST_DEBT_ID, TEST_PAYMENT_ID, TEST_USER_ID,
        { amount: '10000.00' },
      )

      expect(result.amount).toBe('10000.00')
      // Old balance (941500) + old payment (8500) - new payment (10000) = 940000
      expect(debtsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_DEBT_ID, TEST_USER_ID,
        { currentBalance: '940000.00' },
      )
    })

    it('does not adjust balance when amount unchanged', async () => {
      const debt = makeDebt()
      const existing = makePayment()
      vi.mocked(debtsRepository.findById).mockResolvedValue(debt)
      vi.mocked(debtPaymentsRepository.findById).mockResolvedValue(existing)
      vi.mocked(debtPaymentsRepository.update).mockResolvedValue(makePayment({ paymentDate: '2025-03-01' }))

      await debtsService.updatePayment(
        mockDb, TEST_DEBT_ID, TEST_PAYMENT_ID, TEST_USER_ID,
        { paymentDate: '2025-03-01' },
      )

      expect(debtsRepository.update).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when debt does not exist', async () => {
      vi.mocked(debtsRepository.findById).mockResolvedValue(undefined)

      await expect(
        debtsService.updatePayment(mockDb, 'nonexistent', TEST_PAYMENT_ID, TEST_USER_ID, {
          amount: '10000.00',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when payment does not exist', async () => {
      vi.mocked(debtsRepository.findById).mockResolvedValue(makeDebt())
      vi.mocked(debtPaymentsRepository.findById).mockResolvedValue(undefined)

      await expect(
        debtsService.updatePayment(mockDb, TEST_DEBT_ID, 'nonexistent', TEST_USER_ID, {
          amount: '10000.00',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        debtsService.updatePayment(mockDb, TEST_DEBT_ID, TEST_PAYMENT_ID, TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('removePayment', () => {
    it('removes payment and restores debt balance', async () => {
      const debt = makeDebt({ currentBalance: '941500.00' })
      const payment = makePayment({ amount: '8500.00' })
      vi.mocked(debtsRepository.findById).mockResolvedValue(debt)
      vi.mocked(debtPaymentsRepository.findById).mockResolvedValue(payment)
      vi.mocked(debtPaymentsRepository.delete).mockResolvedValue(true)
      vi.mocked(debtsRepository.update).mockResolvedValue(makeDebt({ currentBalance: '950000.00' }))

      await debtsService.removePayment(mockDb, TEST_DEBT_ID, TEST_PAYMENT_ID, TEST_USER_ID)

      expect(debtPaymentsRepository.delete).toHaveBeenCalledWith(mockDb, TEST_PAYMENT_ID, TEST_DEBT_ID)
      // Balance should be restored: 941500 + 8500 = 950000
      expect(debtsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_DEBT_ID, TEST_USER_ID,
        { currentBalance: '950000.00' },
      )
    })

    it('throws NotFoundError when debt does not exist', async () => {
      vi.mocked(debtsRepository.findById).mockResolvedValue(undefined)

      await expect(
        debtsService.removePayment(mockDb, 'nonexistent', TEST_PAYMENT_ID, TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when payment does not exist', async () => {
      vi.mocked(debtsRepository.findById).mockResolvedValue(makeDebt())
      vi.mocked(debtPaymentsRepository.findById).mockResolvedValue(undefined)

      await expect(
        debtsService.removePayment(mockDb, TEST_DEBT_ID, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })
})
