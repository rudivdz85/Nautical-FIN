import { describe, it, expect, vi, beforeEach } from 'vitest'
import { budgetsService } from '../../../packages/core/src/services/budgets.service'
import { budgetsRepository } from '../../../packages/core/src/repositories/budgets.repository'
import { budgetItemsRepository } from '../../../packages/core/src/repositories/budget-items.repository'
import { budgetIncomesRepository } from '../../../packages/core/src/repositories/budget-incomes.repository'
import { plannedOneOffsRepository } from '../../../packages/core/src/repositories/planned-one-offs.repository'
import { accountsRepository } from '../../../packages/core/src/repositories/accounts.repository'
import { categoriesRepository } from '../../../packages/core/src/repositories/categories.repository'
import { NotFoundError, ValidationError, ForbiddenError } from '../../../packages/core/src/errors/index'
import type { Budget, BudgetItem, BudgetIncome, PlannedOneOff } from '../../../packages/core/src/types/budgets'
import type { Account } from '../../../packages/core/src/types/accounts'
import type { Category } from '../../../packages/core/src/types/categories'

vi.mock('../../../packages/core/src/repositories/budgets.repository', () => ({
  budgetsRepository: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    findByUserAndMonth: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/budget-items.repository', () => ({
  budgetItemsRepository: {
    findByBudgetId: vi.fn(),
    findById: vi.fn(),
    findByBudgetAndCategory: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/budget-incomes.repository', () => ({
  budgetIncomesRepository: {
    findByBudgetId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/planned-one-offs.repository', () => ({
  plannedOneOffsRepository: {
    findByBudgetId: vi.fn(),
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

vi.mock('../../../packages/core/src/repositories/categories.repository', () => ({
  categoriesRepository: {
    findByIdAndUserId: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof budgetsService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_BUDGET_ID = '22222222-2222-2222-2222-222222222222'
const TEST_ACCOUNT_ID = '33333333-3333-3333-3333-333333333333'
const TEST_CATEGORY_ID = '44444444-4444-4444-4444-444444444444'
const TEST_ITEM_ID = '55555555-5555-5555-5555-555555555555'
const TEST_INCOME_ID = '66666666-6666-6666-6666-666666666666'
const TEST_ONEOFF_ID = '77777777-7777-7777-7777-777777777777'

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: TEST_BUDGET_ID,
    userId: TEST_USER_ID,
    year: 2025,
    month: 2,
    status: 'draft',
    totalPlannedIncome: '0',
    totalPlannedExpenses: '0',
    totalPlannedSavings: '0',
    totalPlannedDebtPayments: '0',
    unallocatedAmount: '0',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeBudgetItem(overrides: Partial<BudgetItem> = {}): BudgetItem {
  return {
    id: TEST_ITEM_ID,
    budgetId: TEST_BUDGET_ID,
    categoryId: TEST_CATEGORY_ID,
    plannedAmount: '1000.00',
    rolloverAmount: '0',
    surplusAction: 'rollover',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeBudgetIncome(overrides: Partial<BudgetIncome> = {}): BudgetIncome {
  return {
    id: TEST_INCOME_ID,
    budgetId: TEST_BUDGET_ID,
    incomeId: null,
    name: 'Salary',
    expectedAmount: '25000.00',
    expectedDate: null,
    isConfirmed: false,
    actualAmount: null,
    actualDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makePlannedOneOff(overrides: Partial<PlannedOneOff> = {}): PlannedOneOff {
  return {
    id: TEST_ONEOFF_ID,
    budgetId: TEST_BUDGET_ID,
    accountId: TEST_ACCOUNT_ID,
    categoryId: null,
    description: 'Car Service',
    amount: '3500.00',
    expectedDate: '2025-02-15',
    isReserved: true,
    reminderDaysBefore: 14,
    reminderThreshold: '1000',
    lastReminderSent: null,
    lastReminderType: null,
    isCompleted: false,
    actualTransactionId: null,
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

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: TEST_CATEGORY_ID,
    userId: TEST_USER_ID,
    parentId: null,
    name: 'Groceries',
    categoryType: 'expense',
    icon: 'shopping-cart',
    color: null,
    isSystem: false,
    isHidden: false,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function setupRecalculateMocks(
  items: BudgetItem[] = [],
  incomes: BudgetIncome[] = [],
  oneOffs: PlannedOneOff[] = [],
) {
  vi.mocked(budgetItemsRepository.findByBudgetId).mockResolvedValue(items)
  vi.mocked(budgetIncomesRepository.findByBudgetId).mockResolvedValue(incomes)
  vi.mocked(plannedOneOffsRepository.findByBudgetId).mockResolvedValue(oneOffs)
  vi.mocked(budgetsRepository.update).mockResolvedValue(makeBudget())
}

describe('budgetsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Budget CRUD ────────────────────────────────────────────────────

  describe('list', () => {
    it('returns budgets for user', async () => {
      const budgets = [makeBudget()]
      vi.mocked(budgetsRepository.findByUserId).mockResolvedValue(budgets)

      const result = await budgetsService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual(budgets)
    })
  })

  describe('getById', () => {
    it('returns budget with details', async () => {
      const budget = makeBudget()
      const items = [makeBudgetItem()]
      const incomes = [makeBudgetIncome()]
      const oneOffs = [makePlannedOneOff()]

      vi.mocked(budgetsRepository.findById).mockResolvedValue(budget)
      vi.mocked(budgetItemsRepository.findByBudgetId).mockResolvedValue(items)
      vi.mocked(budgetIncomesRepository.findByBudgetId).mockResolvedValue(incomes)
      vi.mocked(plannedOneOffsRepository.findByBudgetId).mockResolvedValue(oneOffs)

      const result = await budgetsService.getById(mockDb, TEST_BUDGET_ID, TEST_USER_ID)

      expect(result.id).toBe(TEST_BUDGET_ID)
      expect(result.items).toEqual(items)
      expect(result.incomes).toEqual(incomes)
      expect(result.plannedOneOffs).toEqual(oneOffs)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(undefined)

      await expect(
        budgetsService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('getByMonth', () => {
    it('returns budget for specific month', async () => {
      const budget = makeBudget()
      vi.mocked(budgetsRepository.findByUserAndMonth).mockResolvedValue(budget)
      vi.mocked(budgetItemsRepository.findByBudgetId).mockResolvedValue([])
      vi.mocked(budgetIncomesRepository.findByBudgetId).mockResolvedValue([])
      vi.mocked(plannedOneOffsRepository.findByBudgetId).mockResolvedValue([])

      const result = await budgetsService.getByMonth(mockDb, TEST_USER_ID, 2025, 2)

      expect(result.year).toBe(2025)
      expect(result.month).toBe(2)
    })

    it('throws NotFoundError when no budget for month', async () => {
      vi.mocked(budgetsRepository.findByUserAndMonth).mockResolvedValue(undefined)

      await expect(
        budgetsService.getByMonth(mockDb, TEST_USER_ID, 2025, 3),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates a budget for a month', async () => {
      const budget = makeBudget()
      vi.mocked(budgetsRepository.findByUserAndMonth).mockResolvedValue(undefined)
      vi.mocked(budgetsRepository.create).mockResolvedValue(budget)

      const result = await budgetsService.create(mockDb, TEST_USER_ID, {
        year: 2025,
        month: 2,
      })

      expect(result).toEqual(budget)
      expect(budgetsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ userId: TEST_USER_ID, year: 2025, month: 2 }),
      )
    })

    it('throws ValidationError when budget already exists for month', async () => {
      vi.mocked(budgetsRepository.findByUserAndMonth).mockResolvedValue(makeBudget())

      await expect(
        budgetsService.create(mockDb, TEST_USER_ID, { year: 2025, month: 2 }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid month', async () => {
      await expect(
        budgetsService.create(mockDb, TEST_USER_ID, { year: 2025, month: 13 }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('update', () => {
    it('updates budget notes', async () => {
      const budget = makeBudget()
      const updated = makeBudget({ notes: 'Updated notes' })
      vi.mocked(budgetsRepository.findById).mockResolvedValue(budget)
      vi.mocked(budgetsRepository.update).mockResolvedValue(updated)

      const result = await budgetsService.update(mockDb, TEST_BUDGET_ID, TEST_USER_ID, {
        notes: 'Updated notes',
      })

      expect(result.notes).toBe('Updated notes')
    })

    it('throws ForbiddenError when budget is closed', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget({ status: 'closed' }))

      await expect(
        budgetsService.update(mockDb, TEST_BUDGET_ID, TEST_USER_ID, { notes: 'Test' }),
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(undefined)

      await expect(
        budgetsService.update(mockDb, 'nonexistent', TEST_USER_ID, { notes: 'Test' }),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('deletes a draft budget', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget({ status: 'draft' }))
      vi.mocked(budgetsRepository.delete).mockResolvedValue(true)

      await expect(
        budgetsService.delete(mockDb, TEST_BUDGET_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws ForbiddenError when deleting closed budget', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget({ status: 'closed' }))

      await expect(
        budgetsService.delete(mockDb, TEST_BUDGET_ID, TEST_USER_ID),
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(undefined)

      await expect(
        budgetsService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  // ── Lifecycle ──────────────────────────────────────────────────────

  describe('activate', () => {
    it('activates a draft budget', async () => {
      const budget = makeBudget({ status: 'draft' })
      const activated = makeBudget({ status: 'active' })
      vi.mocked(budgetsRepository.findById).mockResolvedValue(budget)
      vi.mocked(budgetsRepository.update).mockResolvedValue(activated)

      const result = await budgetsService.activate(mockDb, TEST_BUDGET_ID, TEST_USER_ID)

      expect(result.status).toBe('active')
      expect(budgetsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_BUDGET_ID, TEST_USER_ID, { status: 'active' },
      )
    })

    it('throws ValidationError when already active', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget({ status: 'active' }))

      await expect(
        budgetsService.activate(mockDb, TEST_BUDGET_ID, TEST_USER_ID),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when closed', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget({ status: 'closed' }))

      await expect(
        budgetsService.activate(mockDb, TEST_BUDGET_ID, TEST_USER_ID),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('close', () => {
    it('closes an active budget', async () => {
      const budget = makeBudget({ status: 'active' })
      const closed = makeBudget({ status: 'closed' })
      vi.mocked(budgetsRepository.findById).mockResolvedValue(budget)
      vi.mocked(budgetsRepository.update).mockResolvedValue(closed)

      const result = await budgetsService.close(mockDb, TEST_BUDGET_ID, TEST_USER_ID)

      expect(result.status).toBe('closed')
    })

    it('throws ValidationError when still draft', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget({ status: 'draft' }))

      await expect(
        budgetsService.close(mockDb, TEST_BUDGET_ID, TEST_USER_ID),
      ).rejects.toThrow(ValidationError)
    })
  })

  // ── Budget Items ───────────────────────────────────────────────────

  describe('addItem', () => {
    it('adds a category allocation to budget', async () => {
      const item = makeBudgetItem()
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(makeCategory())
      vi.mocked(budgetItemsRepository.findByBudgetAndCategory).mockResolvedValue(undefined)
      vi.mocked(budgetItemsRepository.create).mockResolvedValue(item)
      setupRecalculateMocks([item])

      const result = await budgetsService.addItem(mockDb, TEST_BUDGET_ID, TEST_USER_ID, {
        categoryId: TEST_CATEGORY_ID,
        plannedAmount: '1000.00',
      })

      expect(result).toEqual(item)
    })

    it('throws ValidationError when category already has an allocation', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(makeCategory())
      vi.mocked(budgetItemsRepository.findByBudgetAndCategory).mockResolvedValue(makeBudgetItem())

      await expect(
        budgetsService.addItem(mockDb, TEST_BUDGET_ID, TEST_USER_ID, {
          categoryId: TEST_CATEGORY_ID,
          plannedAmount: '1000.00',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws NotFoundError when category does not exist', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(undefined)

      await expect(
        budgetsService.addItem(mockDb, TEST_BUDGET_ID, TEST_USER_ID, {
          categoryId: '99999999-9999-9999-9999-999999999999',
          plannedAmount: '1000.00',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when budget is closed', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget({ status: 'closed' }))

      await expect(
        budgetsService.addItem(mockDb, TEST_BUDGET_ID, TEST_USER_ID, {
          categoryId: TEST_CATEGORY_ID,
          plannedAmount: '1000.00',
        }),
      ).rejects.toThrow(ForbiddenError)
    })

    it('recalculates totals after adding item', async () => {
      const item = makeBudgetItem({ plannedAmount: '2000.00' })
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(categoriesRepository.findByIdAndUserId).mockResolvedValue(makeCategory())
      vi.mocked(budgetItemsRepository.findByBudgetAndCategory).mockResolvedValue(undefined)
      vi.mocked(budgetItemsRepository.create).mockResolvedValue(item)
      setupRecalculateMocks([item], [makeBudgetIncome()])

      await budgetsService.addItem(mockDb, TEST_BUDGET_ID, TEST_USER_ID, {
        categoryId: TEST_CATEGORY_ID,
        plannedAmount: '2000.00',
      })

      // recalculateTotals calls budgetsRepository.update with new totals
      expect(budgetsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_BUDGET_ID, TEST_USER_ID,
        expect.objectContaining({
          totalPlannedExpenses: '2000.00',
          totalPlannedIncome: '25000.00',
          unallocatedAmount: '23000.00',
        }),
      )
    })
  })

  describe('updateItem', () => {
    it('updates a budget item amount', async () => {
      const updated = makeBudgetItem({ plannedAmount: '1500.00' })
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(budgetItemsRepository.update).mockResolvedValue(updated)
      setupRecalculateMocks([updated])

      const result = await budgetsService.updateItem(
        mockDb, TEST_BUDGET_ID, TEST_ITEM_ID, TEST_USER_ID,
        { plannedAmount: '1500.00' },
      )

      expect(result.plannedAmount).toBe('1500.00')
    })

    it('throws NotFoundError when item not found', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(budgetItemsRepository.update).mockResolvedValue(undefined)

      await expect(
        budgetsService.updateItem(mockDb, TEST_BUDGET_ID, 'nonexistent', TEST_USER_ID, {
          plannedAmount: '500.00',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        budgetsService.updateItem(mockDb, TEST_BUDGET_ID, TEST_ITEM_ID, TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('removeItem', () => {
    it('removes a budget item and recalculates', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(budgetItemsRepository.delete).mockResolvedValue(true)
      setupRecalculateMocks()

      await expect(
        budgetsService.removeItem(mockDb, TEST_BUDGET_ID, TEST_ITEM_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when item not found', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(budgetItemsRepository.delete).mockResolvedValue(false)

      await expect(
        budgetsService.removeItem(mockDb, TEST_BUDGET_ID, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  // ── Budget Incomes ─────────────────────────────────────────────────

  describe('addIncome', () => {
    it('adds an income source to budget', async () => {
      const income = makeBudgetIncome()
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(budgetIncomesRepository.create).mockResolvedValue(income)
      setupRecalculateMocks([], [income])

      const result = await budgetsService.addIncome(mockDb, TEST_BUDGET_ID, TEST_USER_ID, {
        name: 'Salary',
        expectedAmount: '25000.00',
      })

      expect(result).toEqual(income)
    })

    it('throws ForbiddenError when budget is closed', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget({ status: 'closed' }))

      await expect(
        budgetsService.addIncome(mockDb, TEST_BUDGET_ID, TEST_USER_ID, {
          name: 'Salary',
          expectedAmount: '25000.00',
        }),
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws ValidationError for missing name', async () => {
      await expect(
        budgetsService.addIncome(mockDb, TEST_BUDGET_ID, TEST_USER_ID, {
          name: '',
          expectedAmount: '25000.00',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('updateIncome', () => {
    it('updates an income amount', async () => {
      const updated = makeBudgetIncome({ expectedAmount: '30000.00' })
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(budgetIncomesRepository.update).mockResolvedValue(updated)
      setupRecalculateMocks([], [updated])

      const result = await budgetsService.updateIncome(
        mockDb, TEST_BUDGET_ID, TEST_INCOME_ID, TEST_USER_ID,
        { expectedAmount: '30000.00' },
      )

      expect(result.expectedAmount).toBe('30000.00')
    })

    it('throws NotFoundError when income not found', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(budgetIncomesRepository.update).mockResolvedValue(undefined)

      await expect(
        budgetsService.updateIncome(mockDb, TEST_BUDGET_ID, 'nonexistent', TEST_USER_ID, {
          expectedAmount: '30000.00',
        }),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('removeIncome', () => {
    it('removes an income and recalculates', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(budgetIncomesRepository.delete).mockResolvedValue(true)
      setupRecalculateMocks()

      await expect(
        budgetsService.removeIncome(mockDb, TEST_BUDGET_ID, TEST_INCOME_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when income not found', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(budgetIncomesRepository.delete).mockResolvedValue(false)

      await expect(
        budgetsService.removeIncome(mockDb, TEST_BUDGET_ID, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  // ── Planned One-Offs ───────────────────────────────────────────────

  describe('addPlannedOneOff', () => {
    it('adds a planned one-off expense', async () => {
      const oneOff = makePlannedOneOff()
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(plannedOneOffsRepository.create).mockResolvedValue(oneOff)
      setupRecalculateMocks([], [], [oneOff])

      const result = await budgetsService.addPlannedOneOff(mockDb, TEST_BUDGET_ID, TEST_USER_ID, {
        accountId: TEST_ACCOUNT_ID,
        description: 'Car Service',
        amount: '3500.00',
        expectedDate: '2025-02-15',
      })

      expect(result).toEqual(oneOff)
    })

    it('throws NotFoundError when account does not exist', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(accountsRepository.findById).mockResolvedValue(undefined)

      await expect(
        budgetsService.addPlannedOneOff(mockDb, TEST_BUDGET_ID, TEST_USER_ID, {
          accountId: '99999999-9999-9999-9999-999999999999',
          description: 'Car Service',
          amount: '3500.00',
          expectedDate: '2025-02-15',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when budget is closed', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget({ status: 'closed' }))

      await expect(
        budgetsService.addPlannedOneOff(mockDb, TEST_BUDGET_ID, TEST_USER_ID, {
          accountId: TEST_ACCOUNT_ID,
          description: 'Car Service',
          amount: '3500.00',
          expectedDate: '2025-02-15',
        }),
      ).rejects.toThrow(ForbiddenError)
    })

    it('includes one-off in expense totals recalculation', async () => {
      const oneOff = makePlannedOneOff({ amount: '3500.00' })
      const income = makeBudgetIncome({ expectedAmount: '25000.00' })
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(plannedOneOffsRepository.create).mockResolvedValue(oneOff)
      setupRecalculateMocks([], [income], [oneOff])

      await budgetsService.addPlannedOneOff(mockDb, TEST_BUDGET_ID, TEST_USER_ID, {
        accountId: TEST_ACCOUNT_ID,
        description: 'Car Service',
        amount: '3500.00',
        expectedDate: '2025-02-15',
      })

      expect(budgetsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_BUDGET_ID, TEST_USER_ID,
        expect.objectContaining({
          totalPlannedExpenses: '3500.00',
          totalPlannedIncome: '25000.00',
          unallocatedAmount: '21500.00',
        }),
      )
    })
  })

  describe('updatePlannedOneOff', () => {
    it('updates a planned one-off', async () => {
      const updated = makePlannedOneOff({ amount: '4000.00' })
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(plannedOneOffsRepository.update).mockResolvedValue(updated)
      setupRecalculateMocks([], [], [updated])

      const result = await budgetsService.updatePlannedOneOff(
        mockDb, TEST_BUDGET_ID, TEST_ONEOFF_ID, TEST_USER_ID,
        { amount: '4000.00' },
      )

      expect(result.amount).toBe('4000.00')
    })

    it('throws NotFoundError when one-off not found', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(plannedOneOffsRepository.update).mockResolvedValue(undefined)

      await expect(
        budgetsService.updatePlannedOneOff(mockDb, TEST_BUDGET_ID, 'nonexistent', TEST_USER_ID, {
          amount: '4000.00',
        }),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('removePlannedOneOff', () => {
    it('removes a planned one-off and recalculates', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(plannedOneOffsRepository.delete).mockResolvedValue(true)
      setupRecalculateMocks()

      await expect(
        budgetsService.removePlannedOneOff(mockDb, TEST_BUDGET_ID, TEST_ONEOFF_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when one-off not found', async () => {
      vi.mocked(budgetsRepository.findById).mockResolvedValue(makeBudget())
      vi.mocked(plannedOneOffsRepository.delete).mockResolvedValue(false)

      await expect(
        budgetsService.removePlannedOneOff(mockDb, TEST_BUDGET_ID, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })
})
