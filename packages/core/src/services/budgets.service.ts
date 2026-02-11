import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { budgetsRepository } from '../repositories/budgets.repository'
import { budgetItemsRepository } from '../repositories/budget-items.repository'
import { budgetIncomesRepository } from '../repositories/budget-incomes.repository'
import { plannedOneOffsRepository } from '../repositories/planned-one-offs.repository'
import { accountsRepository } from '../repositories/accounts.repository'
import { categoriesRepository } from '../repositories/categories.repository'
import {
  createBudgetSchema,
  updateBudgetSchema,
  createBudgetItemSchema,
  updateBudgetItemSchema,
  createBudgetIncomeSchema,
  updateBudgetIncomeSchema,
  createPlannedOneOffSchema,
  updatePlannedOneOffSchema,
} from '../validation/budgets'
import type {
  Budget,
  BudgetItem,
  BudgetIncome,
  PlannedOneOff,
  BudgetWithDetails,
} from '../types/budgets'
import { NotFoundError, ValidationError, ForbiddenError } from '../errors/index'

type Database = NeonHttpDatabase

export const budgetsService = {
  // ── Budget CRUD ──────────────────────────────────────────────────────

  async list(db: Database, userId: string): Promise<Budget[]> {
    return budgetsRepository.findByUserId(db, userId)
  },

  async getById(db: Database, id: string, userId: string): Promise<BudgetWithDetails> {
    const budget = await budgetsRepository.findById(db, id, userId)
    if (!budget) {
      throw new NotFoundError('Budget', id)
    }

    const [items, incomes, oneOffs] = await Promise.all([
      budgetItemsRepository.findByBudgetId(db, id),
      budgetIncomesRepository.findByBudgetId(db, id),
      plannedOneOffsRepository.findByBudgetId(db, id),
    ])

    return { ...budget, items, incomes, plannedOneOffs: oneOffs }
  },

  async getByMonth(
    db: Database,
    userId: string,
    year: number,
    month: number,
  ): Promise<BudgetWithDetails> {
    const budget = await budgetsRepository.findByUserAndMonth(db, userId, year, month)
    if (!budget) {
      throw new NotFoundError('Budget', `${year}-${String(month).padStart(2, '0')}`)
    }

    const [items, incomes, oneOffs] = await Promise.all([
      budgetItemsRepository.findByBudgetId(db, budget.id),
      budgetIncomesRepository.findByBudgetId(db, budget.id),
      plannedOneOffsRepository.findByBudgetId(db, budget.id),
    ])

    return { ...budget, items, incomes, plannedOneOffs: oneOffs }
  },

  async create(db: Database, userId: string, input: unknown): Promise<Budget> {
    const parsed = createBudgetSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid budget data', parsed.error.issues)
    }

    const existing = await budgetsRepository.findByUserAndMonth(
      db, userId, parsed.data.year, parsed.data.month,
    )
    if (existing) {
      throw new ValidationError('A budget already exists for this month', {
        month: ['Budget for this month already exists'],
      })
    }

    return budgetsRepository.create(db, {
      userId,
      year: parsed.data.year,
      month: parsed.data.month,
      notes: parsed.data.notes,
    })
  },

  async update(db: Database, id: string, userId: string, input: unknown): Promise<Budget> {
    const parsed = updateBudgetSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid budget data', parsed.error.issues)
    }

    const budget = await budgetsRepository.findById(db, id, userId)
    if (!budget) {
      throw new NotFoundError('Budget', id)
    }

    assertNotClosed(budget)

    const updated = await budgetsRepository.update(db, id, userId, parsed.data)
    if (!updated) {
      throw new NotFoundError('Budget', id)
    }

    return updated
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const budget = await budgetsRepository.findById(db, id, userId)
    if (!budget) {
      throw new NotFoundError('Budget', id)
    }

    if (budget.status === 'closed') {
      throw new ForbiddenError('Cannot delete a closed budget')
    }

    const deleted = await budgetsRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('Budget', id)
    }
  },

  async activate(db: Database, id: string, userId: string): Promise<Budget> {
    const budget = await budgetsRepository.findById(db, id, userId)
    if (!budget) {
      throw new NotFoundError('Budget', id)
    }

    if (budget.status !== 'draft') {
      throw new ValidationError('Only draft budgets can be activated', {
        status: [`Budget is currently ${budget.status}`],
      })
    }

    const updated = await budgetsRepository.update(db, id, userId, { status: 'active' })
    if (!updated) {
      throw new NotFoundError('Budget', id)
    }

    return updated
  },

  async close(db: Database, id: string, userId: string): Promise<Budget> {
    const budget = await budgetsRepository.findById(db, id, userId)
    if (!budget) {
      throw new NotFoundError('Budget', id)
    }

    if (budget.status !== 'active') {
      throw new ValidationError('Only active budgets can be closed', {
        status: [`Budget is currently ${budget.status}`],
      })
    }

    const updated = await budgetsRepository.update(db, id, userId, { status: 'closed' })
    if (!updated) {
      throw new NotFoundError('Budget', id)
    }

    return updated
  },

  // ── Budget Items (per-category allocations) ──────────────────────────

  async addItem(
    db: Database,
    budgetId: string,
    userId: string,
    input: unknown,
  ): Promise<BudgetItem> {
    const parsed = createBudgetItemSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid budget item data', parsed.error.issues)
    }

    const budget = await budgetsRepository.findById(db, budgetId, userId)
    if (!budget) {
      throw new NotFoundError('Budget', budgetId)
    }

    assertNotClosed(budget)

    const category = await categoriesRepository.findByIdAndUserId(db, parsed.data.categoryId, userId)
    if (!category) {
      throw new NotFoundError('Category', parsed.data.categoryId)
    }

    const existing = await budgetItemsRepository.findByBudgetAndCategory(
      db, budgetId, parsed.data.categoryId,
    )
    if (existing) {
      throw new ValidationError('Category already has a budget item', {
        categoryId: ['This category already has an allocation in this budget'],
      })
    }

    const item = await budgetItemsRepository.create(db, {
      budgetId,
      categoryId: parsed.data.categoryId,
      plannedAmount: parsed.data.plannedAmount,
      surplusAction: parsed.data.surplusAction,
    })

    await recalculateTotals(db, budgetId, userId)

    return item
  },

  async updateItem(
    db: Database,
    budgetId: string,
    itemId: string,
    userId: string,
    input: unknown,
  ): Promise<BudgetItem> {
    const parsed = updateBudgetItemSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid budget item data', parsed.error.issues)
    }

    const budget = await budgetsRepository.findById(db, budgetId, userId)
    if (!budget) {
      throw new NotFoundError('Budget', budgetId)
    }

    assertNotClosed(budget)

    const updated = await budgetItemsRepository.update(db, itemId, budgetId, parsed.data)
    if (!updated) {
      throw new NotFoundError('Budget item', itemId)
    }

    await recalculateTotals(db, budgetId, userId)

    return updated
  },

  async removeItem(
    db: Database,
    budgetId: string,
    itemId: string,
    userId: string,
  ): Promise<void> {
    const budget = await budgetsRepository.findById(db, budgetId, userId)
    if (!budget) {
      throw new NotFoundError('Budget', budgetId)
    }

    assertNotClosed(budget)

    const deleted = await budgetItemsRepository.delete(db, itemId, budgetId)
    if (!deleted) {
      throw new NotFoundError('Budget item', itemId)
    }

    await recalculateTotals(db, budgetId, userId)
  },

  // ── Budget Incomes ───────────────────────────────────────────────────

  async addIncome(
    db: Database,
    budgetId: string,
    userId: string,
    input: unknown,
  ): Promise<BudgetIncome> {
    const parsed = createBudgetIncomeSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid budget income data', parsed.error.issues)
    }

    const budget = await budgetsRepository.findById(db, budgetId, userId)
    if (!budget) {
      throw new NotFoundError('Budget', budgetId)
    }

    assertNotClosed(budget)

    const income = await budgetIncomesRepository.create(db, {
      budgetId,
      name: parsed.data.name,
      expectedAmount: parsed.data.expectedAmount,
      expectedDate: parsed.data.expectedDate,
      incomeId: parsed.data.incomeId,
    })

    await recalculateTotals(db, budgetId, userId)

    return income
  },

  async updateIncome(
    db: Database,
    budgetId: string,
    incomeId: string,
    userId: string,
    input: unknown,
  ): Promise<BudgetIncome> {
    const parsed = updateBudgetIncomeSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid budget income data', parsed.error.issues)
    }

    const budget = await budgetsRepository.findById(db, budgetId, userId)
    if (!budget) {
      throw new NotFoundError('Budget', budgetId)
    }

    assertNotClosed(budget)

    const updated = await budgetIncomesRepository.update(db, incomeId, budgetId, parsed.data)
    if (!updated) {
      throw new NotFoundError('Budget income', incomeId)
    }

    await recalculateTotals(db, budgetId, userId)

    return updated
  },

  async removeIncome(
    db: Database,
    budgetId: string,
    incomeId: string,
    userId: string,
  ): Promise<void> {
    const budget = await budgetsRepository.findById(db, budgetId, userId)
    if (!budget) {
      throw new NotFoundError('Budget', budgetId)
    }

    assertNotClosed(budget)

    const deleted = await budgetIncomesRepository.delete(db, incomeId, budgetId)
    if (!deleted) {
      throw new NotFoundError('Budget income', incomeId)
    }

    await recalculateTotals(db, budgetId, userId)
  },

  // ── Planned One-Offs ─────────────────────────────────────────────────

  async addPlannedOneOff(
    db: Database,
    budgetId: string,
    userId: string,
    input: unknown,
  ): Promise<PlannedOneOff> {
    const parsed = createPlannedOneOffSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid planned one-off data', parsed.error.issues)
    }

    const budget = await budgetsRepository.findById(db, budgetId, userId)
    if (!budget) {
      throw new NotFoundError('Budget', budgetId)
    }

    assertNotClosed(budget)

    const account = await accountsRepository.findById(db, parsed.data.accountId, userId)
    if (!account) {
      throw new NotFoundError('Account', parsed.data.accountId)
    }

    const oneOff = await plannedOneOffsRepository.create(db, {
      budgetId,
      accountId: parsed.data.accountId,
      categoryId: parsed.data.categoryId,
      description: parsed.data.description,
      amount: parsed.data.amount,
      expectedDate: parsed.data.expectedDate,
      isReserved: parsed.data.isReserved ?? true,
      reminderDaysBefore: parsed.data.reminderDaysBefore ?? 14,
      reminderThreshold: parsed.data.reminderThreshold,
    })

    await recalculateTotals(db, budgetId, userId)

    return oneOff
  },

  async updatePlannedOneOff(
    db: Database,
    budgetId: string,
    oneOffId: string,
    userId: string,
    input: unknown,
  ): Promise<PlannedOneOff> {
    const parsed = updatePlannedOneOffSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid planned one-off data', parsed.error.issues)
    }

    const budget = await budgetsRepository.findById(db, budgetId, userId)
    if (!budget) {
      throw new NotFoundError('Budget', budgetId)
    }

    assertNotClosed(budget)

    const updated = await plannedOneOffsRepository.update(db, oneOffId, budgetId, parsed.data)
    if (!updated) {
      throw new NotFoundError('Planned one-off', oneOffId)
    }

    await recalculateTotals(db, budgetId, userId)

    return updated
  },

  async removePlannedOneOff(
    db: Database,
    budgetId: string,
    oneOffId: string,
    userId: string,
  ): Promise<void> {
    const budget = await budgetsRepository.findById(db, budgetId, userId)
    if (!budget) {
      throw new NotFoundError('Budget', budgetId)
    }

    assertNotClosed(budget)

    const deleted = await plannedOneOffsRepository.delete(db, oneOffId, budgetId)
    if (!deleted) {
      throw new NotFoundError('Planned one-off', oneOffId)
    }

    await recalculateTotals(db, budgetId, userId)
  },
}

function assertNotClosed(budget: Budget): void {
  if (budget.status === 'closed') {
    throw new ForbiddenError('Cannot modify a closed budget')
  }
}

async function recalculateTotals(
  db: Database,
  budgetId: string,
  userId: string,
): Promise<void> {
  const [items, incomes, oneOffs] = await Promise.all([
    budgetItemsRepository.findByBudgetId(db, budgetId),
    budgetIncomesRepository.findByBudgetId(db, budgetId),
    plannedOneOffsRepository.findByBudgetId(db, budgetId),
  ])

  const totalPlannedIncome = sumAmounts(incomes.map((i) => i.expectedAmount))
  const totalPlannedExpenses = sumAmounts([
    ...items.map((i) => i.plannedAmount),
    ...oneOffs.filter((o) => !o.isCompleted).map((o) => o.amount),
  ])

  const unallocated = subtract(totalPlannedIncome, totalPlannedExpenses)

  await budgetsRepository.update(db, budgetId, userId, {
    totalPlannedIncome: totalPlannedIncome.toFixed(2),
    totalPlannedExpenses: totalPlannedExpenses.toFixed(2),
    unallocatedAmount: unallocated.toFixed(2),
  })
}

function sumAmounts(values: (string | null)[]): number {
  return values.reduce((sum, val) => sum + parseFloat(val ?? '0'), 0)
}

function subtract(a: number, b: number): number {
  return a - b
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
