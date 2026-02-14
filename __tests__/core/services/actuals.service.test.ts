import { describe, it, expect, vi, beforeEach } from 'vitest'
import { actualsService } from '../../../packages/core/src/services/actuals.service'
import { actualsRepository } from '../../../packages/core/src/repositories/actuals.repository'
import { actualCategoriesRepository } from '../../../packages/core/src/repositories/actual-categories.repository'
import { balanceConfirmationsRepository } from '../../../packages/core/src/repositories/balance-confirmations.repository'
import { surplusAllocationsRepository } from '../../../packages/core/src/repositories/surplus-allocations.repository'
import { accountsRepository } from '../../../packages/core/src/repositories/accounts.repository'
import { categoriesRepository } from '../../../packages/core/src/repositories/categories.repository'
import { budgetItemsRepository } from '../../../packages/core/src/repositories/budget-items.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { Actual, ActualCategory, BalanceConfirmation, SurplusAllocation } from '../../../packages/core/src/types/actuals'
import type { Account } from '../../../packages/core/src/types/accounts'
import type { Category } from '../../../packages/core/src/types/categories'
import type { BudgetItem } from '../../../packages/core/src/types/budgets'

vi.mock('../../../packages/core/src/repositories/actuals.repository', () => ({
  actualsRepository: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    findByUserAndMonth: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/actual-categories.repository', () => ({
  actualCategoriesRepository: {
    findByActualId: vi.fn(),
    findById: vi.fn(),
    findByActualAndCategory: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/balance-confirmations.repository', () => ({
  balanceConfirmationsRepository: {
    findByActualId: vi.fn(),
    findById: vi.fn(),
    findByActualAndAccount: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/surplus-allocations.repository', () => ({
  surplusAllocationsRepository: {
    findByActualId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/accounts.repository', () => ({
  accountsRepository: { findById: vi.fn() },
}))

vi.mock('../../../packages/core/src/repositories/categories.repository', () => ({
  categoriesRepository: { findByIdAndUserId: vi.fn() },
}))

vi.mock('../../../packages/core/src/repositories/budget-items.repository', () => ({
  budgetItemsRepository: { findByBudgetId: vi.fn() },
}))

const mockDb = {} as Parameters<typeof actualsService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_ACTUAL_ID = '22222222-2222-2222-2222-222222222222'
const TEST_ACCOUNT_ID = '33333333-3333-3333-3333-333333333333'
const TEST_CATEGORY_ID = '44444444-4444-4444-4444-444444444444'
const TEST_CONFIRMATION_ID = '55555555-5555-5555-5555-555555555555'
const TEST_ALLOCATION_ID = '66666666-6666-6666-6666-666666666666'
const TEST_ACTUAL_CATEGORY_ID = '77777777-7777-7777-7777-777777777777'
const TEST_BUDGET_ID = '88888888-8888-8888-8888-888888888888'

function makeActual(overrides: Partial<Actual> = {}): Actual {
  return {
    id: TEST_ACTUAL_ID,
    userId: TEST_USER_ID,
    budgetId: null,
    year: 2025,
    month: 2,
    status: 'open',
    totalIncome: '25000.00',
    totalExpenses: '18000.00',
    netSavings: '7000.00',
    reconciledAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeActualCategory(overrides: Partial<ActualCategory> = {}): ActualCategory {
  return {
    id: TEST_ACTUAL_CATEGORY_ID,
    actualId: TEST_ACTUAL_ID,
    categoryId: TEST_CATEGORY_ID,
    totalAmount: '5000.00',
    transactionCount: 15,
    budgetedAmount: '4500.00',
    variance: '500.00',
    variancePercentage: '11.11',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeConfirmation(overrides: Partial<BalanceConfirmation> = {}): BalanceConfirmation {
  return {
    id: TEST_CONFIRMATION_ID,
    actualId: TEST_ACTUAL_ID,
    accountId: TEST_ACCOUNT_ID,
    expectedBalance: '10000.00',
    confirmedBalance: null,
    difference: null,
    isConfirmed: false,
    confirmedAt: null,
    notes: null,
    createdAt: new Date(),
    ...overrides,
  }
}

function makeAllocation(overrides: Partial<SurplusAllocation> = {}): SurplusAllocation {
  return {
    id: TEST_ALLOCATION_ID,
    actualId: TEST_ACTUAL_ID,
    categoryId: null,
    amount: '2000.00',
    action: 'savings',
    targetSavingsGoalId: null,
    targetCategoryId: null,
    isActioned: false,
    actionedAt: null,
    createdAt: new Date(),
    ...overrides,
  }
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: TEST_ACCOUNT_ID,
    userId: TEST_USER_ID,
    name: 'Cheque',
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

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
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
  }
}

function setupDetailsMocks() {
  vi.mocked(actualCategoriesRepository.findByActualId).mockResolvedValue([])
  vi.mocked(balanceConfirmationsRepository.findByActualId).mockResolvedValue([])
  vi.mocked(surplusAllocationsRepository.findByActualId).mockResolvedValue([])
}

describe('actualsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns actuals for user', async () => {
      const actuals = [makeActual()]
      vi.mocked(actualsRepository.findByUserId).mockResolvedValue(actuals)

      const result = await actualsService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual(actuals)
    })
  })

  describe('getById', () => {
    it('returns actual with details', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual())
      const categories = [makeActualCategory()]
      const confirmations = [makeConfirmation()]
      const allocations = [makeAllocation()]
      vi.mocked(actualCategoriesRepository.findByActualId).mockResolvedValue(categories)
      vi.mocked(balanceConfirmationsRepository.findByActualId).mockResolvedValue(confirmations)
      vi.mocked(surplusAllocationsRepository.findByActualId).mockResolvedValue(allocations)

      const result = await actualsService.getById(mockDb, TEST_ACTUAL_ID, TEST_USER_ID)

      expect(result.categories).toEqual(categories)
      expect(result.balanceConfirmations).toEqual(confirmations)
      expect(result.surplusAllocations).toEqual(allocations)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(undefined)

      await expect(
        actualsService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('getByMonth', () => {
    it('returns actual for specific month', async () => {
      vi.mocked(actualsRepository.findByUserAndMonth).mockResolvedValue(makeActual())
      setupDetailsMocks()

      const result = await actualsService.getByMonth(mockDb, TEST_USER_ID, 2025, 2)

      expect(result.year).toBe(2025)
      expect(result.month).toBe(2)
    })

    it('throws NotFoundError when month not found', async () => {
      vi.mocked(actualsRepository.findByUserAndMonth).mockResolvedValue(undefined)

      await expect(
        actualsService.getByMonth(mockDb, TEST_USER_ID, 2025, 12),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates an actual', async () => {
      const actual = makeActual()
      vi.mocked(actualsRepository.findByUserAndMonth).mockResolvedValue(undefined)
      vi.mocked(actualsRepository.create).mockResolvedValue(actual)

      const result = await actualsService.create(mockDb, TEST_USER_ID, {
        year: 2025,
        month: 2,
      })

      expect(result).toEqual(actual)
    })

    it('throws ValidationError when month already exists', async () => {
      vi.mocked(actualsRepository.findByUserAndMonth).mockResolvedValue(makeActual())

      await expect(
        actualsService.create(mockDb, TEST_USER_ID, { year: 2025, month: 2 }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid month', async () => {
      await expect(
        actualsService.create(mockDb, TEST_USER_ID, { year: 2025, month: 13 }),
      ).rejects.toThrow(ValidationError)
    })

    it('auto-populates actual categories from budget items when budgetId is provided', async () => {
      const actual = makeActual({ budgetId: TEST_BUDGET_ID })
      vi.mocked(actualsRepository.findByUserAndMonth).mockResolvedValue(undefined)
      vi.mocked(actualsRepository.create).mockResolvedValue(actual)

      const budgetItems: BudgetItem[] = [
        {
          id: 'bi-1',
          budgetId: TEST_BUDGET_ID,
          categoryId: TEST_CATEGORY_ID,
          plannedAmount: '3000.00',
          rolloverAmount: '0',
          surplusAction: 'rollover',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'bi-2',
          budgetId: TEST_BUDGET_ID,
          categoryId: 'cat-2',
          plannedAmount: '1500.00',
          rolloverAmount: '0',
          surplusAction: 'rollover',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      vi.mocked(budgetItemsRepository.findByBudgetId).mockResolvedValue(budgetItems)
      vi.mocked(actualCategoriesRepository.create).mockResolvedValue(makeActualCategory())

      await actualsService.create(mockDb, TEST_USER_ID, {
        year: 2025,
        month: 2,
        budgetId: TEST_BUDGET_ID,
      })

      expect(budgetItemsRepository.findByBudgetId).toHaveBeenCalledWith(mockDb, TEST_BUDGET_ID)
      expect(actualCategoriesRepository.create).toHaveBeenCalledTimes(2)
      expect(actualCategoriesRepository.create).toHaveBeenCalledWith(mockDb, {
        actualId: TEST_ACTUAL_ID,
        categoryId: TEST_CATEGORY_ID,
        budgetedAmount: '3000.00',
      })
      expect(actualCategoriesRepository.create).toHaveBeenCalledWith(mockDb, {
        actualId: TEST_ACTUAL_ID,
        categoryId: 'cat-2',
        budgetedAmount: '1500.00',
      })
    })

    it('does not fetch budget items when no budgetId', async () => {
      const actual = makeActual()
      vi.mocked(actualsRepository.findByUserAndMonth).mockResolvedValue(undefined)
      vi.mocked(actualsRepository.create).mockResolvedValue(actual)

      await actualsService.create(mockDb, TEST_USER_ID, {
        year: 2025,
        month: 2,
      })

      expect(budgetItemsRepository.findByBudgetId).not.toHaveBeenCalled()
      expect(actualCategoriesRepository.create).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('updates actual fields', async () => {
      const existing = makeActual()
      const updated = makeActual({ totalIncome: '30000.00' })
      vi.mocked(actualsRepository.findById).mockResolvedValue(existing)
      vi.mocked(actualsRepository.update).mockResolvedValue(updated)

      const result = await actualsService.update(mockDb, TEST_ACTUAL_ID, TEST_USER_ID, {
        totalIncome: '30000.00',
      })

      expect(result.totalIncome).toBe('30000.00')
    })

    it('throws ValidationError when actual is closed', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual({ status: 'closed' }))

      await expect(
        actualsService.update(mockDb, TEST_ACTUAL_ID, TEST_USER_ID, { totalIncome: '30000.00' }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        actualsService.update(mockDb, TEST_ACTUAL_ID, TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('delete', () => {
    it('deletes an actual', async () => {
      vi.mocked(actualsRepository.delete).mockResolvedValue(true)

      await expect(
        actualsService.delete(mockDb, TEST_ACTUAL_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(actualsRepository.delete).mockResolvedValue(false)

      await expect(
        actualsService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('lifecycle', () => {
    it('transitions from open to reconciling', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual({ status: 'open' }))
      vi.mocked(actualsRepository.update).mockResolvedValue(makeActual({ status: 'reconciling' }))

      const result = await actualsService.startReconciling(mockDb, TEST_ACTUAL_ID, TEST_USER_ID)

      expect(result.status).toBe('reconciling')
    })

    it('rejects reconciling from non-open status', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual({ status: 'closed' }))

      await expect(
        actualsService.startReconciling(mockDb, TEST_ACTUAL_ID, TEST_USER_ID),
      ).rejects.toThrow(ValidationError)
    })

    it('transitions from reconciling to closed', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual({ status: 'reconciling' }))
      vi.mocked(actualsRepository.update).mockResolvedValue(makeActual({ status: 'closed' }))

      const result = await actualsService.close(mockDb, TEST_ACTUAL_ID, TEST_USER_ID)

      expect(result.status).toBe('closed')
      expect(actualsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_ACTUAL_ID, TEST_USER_ID,
        expect.objectContaining({ status: 'closed', reconciledAt: expect.any(Date) }),
      )
    })

    it('rejects closing from non-reconciling status', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual({ status: 'open' }))

      await expect(
        actualsService.close(mockDb, TEST_ACTUAL_ID, TEST_USER_ID),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('addCategory', () => {
    it('adds a category to the actual', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual())
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(makeCategory())
      vi.mocked(actualCategoriesRepository.findByActualAndCategory).mockResolvedValue(undefined)
      vi.mocked(actualCategoriesRepository.create).mockResolvedValue(makeActualCategory())

      const result = await actualsService.addCategory(mockDb, TEST_ACTUAL_ID, TEST_USER_ID, {
        categoryId: TEST_CATEGORY_ID,
      })

      expect(result.categoryId).toBe(TEST_CATEGORY_ID)
    })

    it('prevents duplicate category', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual())
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(makeCategory())
      vi.mocked(actualCategoriesRepository.findByActualAndCategory).mockResolvedValue(makeActualCategory())

      await expect(
        actualsService.addCategory(mockDb, TEST_ACTUAL_ID, TEST_USER_ID, {
          categoryId: TEST_CATEGORY_ID,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('rejects when actual is closed', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual({ status: 'closed' }))

      await expect(
        actualsService.addCategory(mockDb, TEST_ACTUAL_ID, TEST_USER_ID, {
          categoryId: TEST_CATEGORY_ID,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws NotFoundError for invalid category', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual())
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(undefined)

      await expect(
        actualsService.addCategory(mockDb, TEST_ACTUAL_ID, TEST_USER_ID, {
          categoryId: TEST_CATEGORY_ID,
        }),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('balance confirmations', () => {
    it('adds a balance confirmation', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual())
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(balanceConfirmationsRepository.findByActualAndAccount).mockResolvedValue(undefined)
      vi.mocked(balanceConfirmationsRepository.create).mockResolvedValue(makeConfirmation())

      const result = await actualsService.addBalanceConfirmation(
        mockDb, TEST_ACTUAL_ID, TEST_USER_ID, {
          accountId: TEST_ACCOUNT_ID,
          expectedBalance: '10000.00',
        },
      )

      expect(result.accountId).toBe(TEST_ACCOUNT_ID)
    })

    it('prevents duplicate account confirmation', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual())
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(balanceConfirmationsRepository.findByActualAndAccount).mockResolvedValue(makeConfirmation())

      await expect(
        actualsService.addBalanceConfirmation(
          mockDb, TEST_ACTUAL_ID, TEST_USER_ID, {
            accountId: TEST_ACCOUNT_ID,
            expectedBalance: '10000.00',
          },
        ),
      ).rejects.toThrow(ValidationError)
    })

    it('confirms balance and computes difference', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual())
      vi.mocked(balanceConfirmationsRepository.findById).mockResolvedValue(
        makeConfirmation({ expectedBalance: '10000.00' }),
      )
      vi.mocked(balanceConfirmationsRepository.update).mockResolvedValue(
        makeConfirmation({
          confirmedBalance: '9500.00',
          difference: '-500.00',
          isConfirmed: true,
        }),
      )

      const result = await actualsService.confirmBalance(
        mockDb, TEST_ACTUAL_ID, TEST_CONFIRMATION_ID, TEST_USER_ID, {
          confirmedBalance: '9500.00',
        },
      )

      expect(result.isConfirmed).toBe(true)
      expect(balanceConfirmationsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_CONFIRMATION_ID, TEST_ACTUAL_ID,
        expect.objectContaining({
          confirmedBalance: '9500.00',
          difference: '-500.00',
          isConfirmed: true,
          confirmedAt: expect.any(Date),
        }),
      )
    })

    it('throws NotFoundError for invalid account', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual())
      vi.mocked(accountsRepository.findById).mockResolvedValue(undefined)

      await expect(
        actualsService.addBalanceConfirmation(
          mockDb, TEST_ACTUAL_ID, TEST_USER_ID, {
            accountId: TEST_ACCOUNT_ID,
            expectedBalance: '10000.00',
          },
        ),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('surplus allocations', () => {
    it('adds a surplus allocation', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual())
      vi.mocked(surplusAllocationsRepository.create).mockResolvedValue(makeAllocation())

      const result = await actualsService.addSurplusAllocation(
        mockDb, TEST_ACTUAL_ID, TEST_USER_ID, {
          amount: '2000.00',
          action: 'savings',
        },
      )

      expect(result.amount).toBe('2000.00')
      expect(result.action).toBe('savings')
    })

    it('actions a surplus allocation', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual())
      vi.mocked(surplusAllocationsRepository.findById).mockResolvedValue(makeAllocation())
      vi.mocked(surplusAllocationsRepository.update).mockResolvedValue(
        makeAllocation({ isActioned: true, actionedAt: new Date() }),
      )

      const result = await actualsService.actionSurplusAllocation(
        mockDb, TEST_ACTUAL_ID, TEST_ALLOCATION_ID, TEST_USER_ID,
      )

      expect(result.isActioned).toBe(true)
    })

    it('rejects actioning already-actioned allocation', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual())
      vi.mocked(surplusAllocationsRepository.findById).mockResolvedValue(
        makeAllocation({ isActioned: true }),
      )

      await expect(
        actualsService.actionSurplusAllocation(
          mockDb, TEST_ACTUAL_ID, TEST_ALLOCATION_ID, TEST_USER_ID,
        ),
      ).rejects.toThrow(ValidationError)
    })

    it('rejects adding allocation to closed actual', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual({ status: 'closed' }))

      await expect(
        actualsService.addSurplusAllocation(
          mockDb, TEST_ACTUAL_ID, TEST_USER_ID, {
            amount: '2000.00',
            action: 'savings',
          },
        ),
      ).rejects.toThrow(ValidationError)
    })

    it('removes a surplus allocation', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual())
      vi.mocked(surplusAllocationsRepository.delete).mockResolvedValue(true)

      await expect(
        actualsService.removeSurplusAllocation(
          mockDb, TEST_ACTUAL_ID, TEST_ALLOCATION_ID, TEST_USER_ID,
        ),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when removing nonexistent allocation', async () => {
      vi.mocked(actualsRepository.findById).mockResolvedValue(makeActual())
      vi.mocked(surplusAllocationsRepository.delete).mockResolvedValue(false)

      await expect(
        actualsService.removeSurplusAllocation(
          mockDb, TEST_ACTUAL_ID, 'nonexistent', TEST_USER_ID,
        ),
      ).rejects.toThrow(NotFoundError)
    })
  })
})
