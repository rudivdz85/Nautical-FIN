import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { incomesRepository } from '../repositories/incomes.repository'
import { accountsRepository } from '../repositories/accounts.repository'
import { createIncomeSchema, updateIncomeSchema } from '../validation/incomes'
import type { Income } from '../types/incomes'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const incomesService = {
  async list(db: Database, userId: string): Promise<Income[]> {
    return incomesRepository.findByUserId(db, userId)
  },

  async listAll(db: Database, userId: string): Promise<Income[]> {
    return incomesRepository.findAllByUserId(db, userId)
  },

  async getById(db: Database, id: string, userId: string): Promise<Income> {
    const income = await incomesRepository.findById(db, id, userId)
    if (!income) {
      throw new NotFoundError('Income', id)
    }
    return income
  },

  async create(db: Database, userId: string, input: unknown): Promise<Income> {
    const parsed = createIncomeSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid income data', parsed.error.issues)
    }

    const data = parsed.data

    const account = await accountsRepository.findById(db, data.accountId, userId)
    if (!account) {
      throw new NotFoundError('Account', data.accountId)
    }

    const nextExpected = computeNextExpected(
      data.frequency,
      data.expectedDay,
    )

    // If marking as primary salary, clear any existing primary
    if (data.isPrimarySalary) {
      const existingPrimary = await incomesRepository.findPrimarySalary(db, userId)
      if (existingPrimary) {
        await incomesRepository.update(db, existingPrimary.id, userId, {
          isPrimarySalary: false,
        })
      }
    }

    return incomesRepository.create(db, {
      userId,
      accountId: data.accountId,
      recurringId: data.recurringId,
      name: data.name,
      amount: data.amount,
      frequency: data.frequency,
      expectedDay: data.expectedDay,
      isConfirmed: data.isConfirmed ?? true,
      confirmationRequiredMonthly: data.confirmationRequiredMonthly ?? false,
      isPrimarySalary: data.isPrimarySalary ?? false,
      nextExpected,
      notes: data.notes,
    })
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    input: unknown,
  ): Promise<Income> {
    const parsed = updateIncomeSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid income data', parsed.error.issues)
    }

    const existing = await incomesRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('Income', id)
    }

    const data = parsed.data

    // If marking as primary salary, clear any existing primary
    if (data.isPrimarySalary) {
      const existingPrimary = await incomesRepository.findPrimarySalary(db, userId)
      if (existingPrimary && existingPrimary.id !== id) {
        await incomesRepository.update(db, existingPrimary.id, userId, {
          isPrimarySalary: false,
        })
      }
    }

    const updated = await incomesRepository.update(db, id, userId, data)
    if (!updated) {
      throw new NotFoundError('Income', id)
    }

    return updated
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const deleted = await incomesRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('Income', id)
    }
  },

  async confirm(
    db: Database,
    id: string,
    userId: string,
    actualDate: string,
  ): Promise<Income> {
    const income = await incomesRepository.findById(db, id, userId)
    if (!income) {
      throw new NotFoundError('Income', id)
    }

    const nextExpected = computeNextExpected(
      income.frequency,
      income.expectedDay ?? undefined,
    )

    const updated = await incomesRepository.update(db, id, userId, {
      isConfirmed: true,
      lastReceived: actualDate,
      nextExpected,
    })

    if (!updated) {
      throw new NotFoundError('Income', id)
    }

    return updated
  },
}

function computeNextExpected(
  frequency: 'weekly' | 'monthly' | 'yearly',
  expectedDay?: number,
): string {
  const now = new Date()

  switch (frequency) {
    case 'weekly': {
      const next = new Date(now)
      next.setDate(next.getDate() + 7)
      return next.toISOString().split('T')[0]!
    }
    case 'monthly': {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      if (expectedDay) {
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        next.setDate(Math.min(expectedDay, maxDay))
      }
      return next.toISOString().split('T')[0]!
    }
    case 'yearly': {
      const next = new Date(now)
      next.setFullYear(next.getFullYear() + 1)
      return next.toISOString().split('T')[0]!
    }
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
