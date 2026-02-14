import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { actualsRepository } from '../repositories/actuals.repository'
import { actualCategoriesRepository } from '../repositories/actual-categories.repository'
import { balanceConfirmationsRepository } from '../repositories/balance-confirmations.repository'
import { surplusAllocationsRepository } from '../repositories/surplus-allocations.repository'
import { accountsRepository } from '../repositories/accounts.repository'
import { categoriesRepository } from '../repositories/categories.repository'
import { budgetItemsRepository } from '../repositories/budget-items.repository'
import {
  createActualSchema,
  updateActualSchema,
  createActualCategorySchema,
  updateActualCategorySchema,
  createBalanceConfirmationSchema,
  confirmBalanceSchema,
  createSurplusAllocationSchema,
} from '../validation/actuals'
import type {
  Actual,
  ActualCategory,
  BalanceConfirmation,
  SurplusAllocation,
  ActualWithDetails,
} from '../types/actuals'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const actualsService = {
  async list(db: Database, userId: string): Promise<Actual[]> {
    return actualsRepository.findByUserId(db, userId)
  },

  async getById(db: Database, id: string, userId: string): Promise<ActualWithDetails> {
    const actual = await actualsRepository.findById(db, id, userId)
    if (!actual) {
      throw new NotFoundError('Actual', id)
    }

    const [categories, balanceConfirmations, surplusAllocs] = await Promise.all([
      actualCategoriesRepository.findByActualId(db, id),
      balanceConfirmationsRepository.findByActualId(db, id),
      surplusAllocationsRepository.findByActualId(db, id),
    ])

    return {
      ...actual,
      categories,
      balanceConfirmations,
      surplusAllocations: surplusAllocs,
    }
  },

  async getByMonth(
    db: Database,
    userId: string,
    year: number,
    month: number,
  ): Promise<ActualWithDetails> {
    const actual = await actualsRepository.findByUserAndMonth(db, userId, year, month)
    if (!actual) {
      throw new NotFoundError('Actual', `${year}-${month}`)
    }

    const [categories, balanceConfirmations, surplusAllocs] = await Promise.all([
      actualCategoriesRepository.findByActualId(db, actual.id),
      balanceConfirmationsRepository.findByActualId(db, actual.id),
      surplusAllocationsRepository.findByActualId(db, actual.id),
    ])

    return {
      ...actual,
      categories,
      balanceConfirmations,
      surplusAllocations: surplusAllocs,
    }
  },

  async create(db: Database, userId: string, input: unknown): Promise<Actual> {
    const parsed = createActualSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid actual data', parsed.error.issues)
    }

    const data = parsed.data

    const existing = await actualsRepository.findByUserAndMonth(db, userId, data.year, data.month)
    if (existing) {
      throw new ValidationError('Actual already exists for this month', {
        month: ['An actual record already exists for this month'],
      })
    }

    const actual = await actualsRepository.create(db, {
      userId,
      budgetId: data.budgetId,
      year: data.year,
      month: data.month,
      notes: data.notes,
    })

    if (data.budgetId) {
      const budgetItems = await budgetItemsRepository.findByBudgetId(db, data.budgetId)
      for (const item of budgetItems) {
        if (item.categoryId) {
          await actualCategoriesRepository.create(db, {
            actualId: actual.id,
            categoryId: item.categoryId,
            budgetedAmount: item.plannedAmount,
          })
        }
      }
    }

    return actual
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    input: unknown,
  ): Promise<Actual> {
    const parsed = updateActualSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid actual data', parsed.error.issues)
    }

    const existing = await actualsRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('Actual', id)
    }

    assertNotClosed(existing)

    const updated = await actualsRepository.update(db, id, userId, parsed.data)
    if (!updated) {
      throw new NotFoundError('Actual', id)
    }

    return updated
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const deleted = await actualsRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('Actual', id)
    }
  },

  // Lifecycle

  async startReconciling(db: Database, id: string, userId: string): Promise<Actual> {
    const actual = await actualsRepository.findById(db, id, userId)
    if (!actual) {
      throw new NotFoundError('Actual', id)
    }

    if (actual.status !== 'open') {
      throw new ValidationError('Can only start reconciling from open status', {
        status: [`Current status is '${actual.status}', expected 'open'`],
      })
    }

    const updated = await actualsRepository.update(db, id, userId, {
      status: 'reconciling',
    })

    return updated!
  },

  async close(db: Database, id: string, userId: string): Promise<Actual> {
    const actual = await actualsRepository.findById(db, id, userId)
    if (!actual) {
      throw new NotFoundError('Actual', id)
    }

    if (actual.status !== 'reconciling') {
      throw new ValidationError('Can only close from reconciling status', {
        status: [`Current status is '${actual.status}', expected 'reconciling'`],
      })
    }

    const updated = await actualsRepository.update(db, id, userId, {
      status: 'closed',
      reconciledAt: new Date(),
    })

    return updated!
  },

  // Actual Categories

  async addCategory(
    db: Database,
    actualId: string,
    userId: string,
    input: unknown,
  ): Promise<ActualCategory> {
    const parsed = createActualCategorySchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid category data', parsed.error.issues)
    }

    const actual = await actualsRepository.findById(db, actualId, userId)
    if (!actual) {
      throw new NotFoundError('Actual', actualId)
    }

    assertNotClosed(actual)

    const data = parsed.data

    const category = await categoriesRepository.findByIdAndUserId(db, data.categoryId, userId)
    if (!category) {
      throw new NotFoundError('Category', data.categoryId)
    }

    const existing = await actualCategoriesRepository.findByActualAndCategory(
      db, actualId, data.categoryId,
    )
    if (existing) {
      throw new ValidationError('Category already exists for this actual', {
        categoryId: ['This category is already tracked for this month'],
      })
    }

    return actualCategoriesRepository.create(db, {
      actualId,
      categoryId: data.categoryId,
      totalAmount: data.totalAmount,
      transactionCount: data.transactionCount,
      budgetedAmount: data.budgetedAmount,
    })
  },

  async updateCategory(
    db: Database,
    actualId: string,
    categoryId: string,
    userId: string,
    input: unknown,
  ): Promise<ActualCategory> {
    const parsed = updateActualCategorySchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid category data', parsed.error.issues)
    }

    const actual = await actualsRepository.findById(db, actualId, userId)
    if (!actual) {
      throw new NotFoundError('Actual', actualId)
    }

    assertNotClosed(actual)

    const updated = await actualCategoriesRepository.update(
      db, categoryId, actualId, parsed.data,
    )
    if (!updated) {
      throw new NotFoundError('ActualCategory', categoryId)
    }

    return updated
  },

  async removeCategory(
    db: Database,
    actualId: string,
    categoryId: string,
    userId: string,
  ): Promise<void> {
    const actual = await actualsRepository.findById(db, actualId, userId)
    if (!actual) {
      throw new NotFoundError('Actual', actualId)
    }

    assertNotClosed(actual)

    const deleted = await actualCategoriesRepository.delete(db, categoryId, actualId)
    if (!deleted) {
      throw new NotFoundError('ActualCategory', categoryId)
    }
  },

  // Balance Confirmations

  async addBalanceConfirmation(
    db: Database,
    actualId: string,
    userId: string,
    input: unknown,
  ): Promise<BalanceConfirmation> {
    const parsed = createBalanceConfirmationSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid confirmation data', parsed.error.issues)
    }

    const actual = await actualsRepository.findById(db, actualId, userId)
    if (!actual) {
      throw new NotFoundError('Actual', actualId)
    }

    const data = parsed.data

    const account = await accountsRepository.findById(db, data.accountId, userId)
    if (!account) {
      throw new NotFoundError('Account', data.accountId)
    }

    const existing = await balanceConfirmationsRepository.findByActualAndAccount(
      db, actualId, data.accountId,
    )
    if (existing) {
      throw new ValidationError('Balance confirmation already exists for this account', {
        accountId: ['This account already has a balance confirmation for this month'],
      })
    }

    return balanceConfirmationsRepository.create(db, {
      actualId,
      accountId: data.accountId,
      expectedBalance: data.expectedBalance,
      notes: data.notes,
    })
  },

  async confirmBalance(
    db: Database,
    actualId: string,
    confirmationId: string,
    userId: string,
    input: unknown,
  ): Promise<BalanceConfirmation> {
    const parsed = confirmBalanceSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid confirmation data', parsed.error.issues)
    }

    const actual = await actualsRepository.findById(db, actualId, userId)
    if (!actual) {
      throw new NotFoundError('Actual', actualId)
    }

    const confirmation = await balanceConfirmationsRepository.findById(
      db, confirmationId, actualId,
    )
    if (!confirmation) {
      throw new NotFoundError('BalanceConfirmation', confirmationId)
    }

    const data = parsed.data
    const expected = parseFloat(confirmation.expectedBalance)
    const confirmed = parseFloat(data.confirmedBalance)
    const difference = Math.round((confirmed - expected) * 100) / 100

    const updated = await balanceConfirmationsRepository.update(
      db, confirmationId, actualId, {
        confirmedBalance: data.confirmedBalance,
        difference: difference.toFixed(2),
        isConfirmed: true,
        confirmedAt: new Date(),
        notes: data.notes ?? confirmation.notes,
      },
    )

    return updated!
  },

  async removeBalanceConfirmation(
    db: Database,
    actualId: string,
    confirmationId: string,
    userId: string,
  ): Promise<void> {
    const actual = await actualsRepository.findById(db, actualId, userId)
    if (!actual) {
      throw new NotFoundError('Actual', actualId)
    }

    const deleted = await balanceConfirmationsRepository.delete(db, confirmationId, actualId)
    if (!deleted) {
      throw new NotFoundError('BalanceConfirmation', confirmationId)
    }
  },

  // Surplus Allocations

  async addSurplusAllocation(
    db: Database,
    actualId: string,
    userId: string,
    input: unknown,
  ): Promise<SurplusAllocation> {
    const parsed = createSurplusAllocationSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid allocation data', parsed.error.issues)
    }

    const actual = await actualsRepository.findById(db, actualId, userId)
    if (!actual) {
      throw new NotFoundError('Actual', actualId)
    }

    assertNotClosed(actual)

    return surplusAllocationsRepository.create(db, {
      actualId,
      categoryId: parsed.data.categoryId,
      amount: parsed.data.amount,
      action: parsed.data.action,
      targetSavingsGoalId: parsed.data.targetSavingsGoalId,
      targetCategoryId: parsed.data.targetCategoryId,
    })
  },

  async actionSurplusAllocation(
    db: Database,
    actualId: string,
    allocationId: string,
    userId: string,
  ): Promise<SurplusAllocation> {
    const actual = await actualsRepository.findById(db, actualId, userId)
    if (!actual) {
      throw new NotFoundError('Actual', actualId)
    }

    const allocation = await surplusAllocationsRepository.findById(
      db, allocationId, actualId,
    )
    if (!allocation) {
      throw new NotFoundError('SurplusAllocation', allocationId)
    }

    if (allocation.isActioned) {
      throw new ValidationError('Allocation has already been actioned', {
        isActioned: ['This allocation has already been actioned'],
      })
    }

    const updated = await surplusAllocationsRepository.update(
      db, allocationId, actualId, {
        isActioned: true,
        actionedAt: new Date(),
      },
    )

    return updated!
  },

  async removeSurplusAllocation(
    db: Database,
    actualId: string,
    allocationId: string,
    userId: string,
  ): Promise<void> {
    const actual = await actualsRepository.findById(db, actualId, userId)
    if (!actual) {
      throw new NotFoundError('Actual', actualId)
    }

    assertNotClosed(actual)

    const deleted = await surplusAllocationsRepository.delete(db, allocationId, actualId)
    if (!deleted) {
      throw new NotFoundError('SurplusAllocation', allocationId)
    }
  },
}

function assertNotClosed(actual: Actual): void {
  if (actual.status === 'closed') {
    throw new ValidationError('Cannot modify a closed actual', {
      status: ['This actual has been closed and cannot be modified'],
    })
  }
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
