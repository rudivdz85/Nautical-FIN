import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { recurringTransactionsRepository } from '../repositories/recurring-transactions.repository'
import { accountsRepository } from '../repositories/accounts.repository'
import { transactionsRepository } from '../repositories/transactions.repository'
import {
  createRecurringTransactionSchema,
  updateRecurringTransactionSchema,
} from '../validation/recurring-transactions'
import type { RecurringTransaction, RecurringFrequency } from '../types/recurring-transactions'
import type { Transaction } from '../types/transactions'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const recurringTransactionsService = {
  async list(db: Database, userId: string): Promise<RecurringTransaction[]> {
    return recurringTransactionsRepository.findByUserId(db, userId)
  },

  async listAll(db: Database, userId: string): Promise<RecurringTransaction[]> {
    return recurringTransactionsRepository.findAllByUserId(db, userId)
  },

  async getById(db: Database, id: string, userId: string): Promise<RecurringTransaction> {
    const recurring = await recurringTransactionsRepository.findById(db, id, userId)
    if (!recurring) {
      throw new NotFoundError('Recurring transaction', id)
    }
    return recurring
  },

  async create(db: Database, userId: string, input: unknown): Promise<RecurringTransaction> {
    const parsed = createRecurringTransactionSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid recurring transaction data', parsed.error.issues)
    }

    const data = parsed.data

    const account = await accountsRepository.findById(db, data.accountId, userId)
    if (!account) {
      throw new NotFoundError('Account', data.accountId)
    }

    const nextOccurrence = computeNextOccurrence(
      data.startDate,
      data.frequency,
      data.dayOfMonth,
      data.dayOfWeek,
    )

    const requiresConfirmation = data.requiresConfirmation ?? data.amountType === 'variable'

    return recurringTransactionsRepository.create(db, {
      userId,
      accountId: data.accountId,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      amountType: data.amountType,
      amount: data.amount,
      amountMax: data.amountMax,
      frequency: data.frequency,
      dayOfMonth: data.dayOfMonth,
      dayOfWeek: data.dayOfWeek,
      startDate: data.startDate,
      nextOccurrence,
      transactionType: data.transactionType,
      requiresConfirmation,
      merchantPattern: data.merchantPattern,
    })
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    input: unknown,
  ): Promise<RecurringTransaction> {
    const parsed = updateRecurringTransactionSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid recurring transaction data', parsed.error.issues)
    }

    const existing = await recurringTransactionsRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('Recurring transaction', id)
    }

    const updated = await recurringTransactionsRepository.update(db, id, userId, parsed.data)
    if (!updated) {
      throw new NotFoundError('Recurring transaction', id)
    }

    return updated
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const deleted = await recurringTransactionsRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('Recurring transaction', id)
    }
  },

  async getDue(db: Database, userId: string, asOfDate: string): Promise<RecurringTransaction[]> {
    return recurringTransactionsRepository.findDue(db, userId, asOfDate)
  },

  async generateInstance(
    db: Database,
    id: string,
    userId: string,
    amount: string,
  ): Promise<Transaction> {
    const recurring = await recurringTransactionsRepository.findById(db, id, userId)
    if (!recurring) {
      throw new NotFoundError('Recurring transaction', id)
    }

    if (!recurring.nextOccurrence) {
      throw new ValidationError('Recurring transaction has no next occurrence')
    }

    const transaction = await transactionsRepository.create(db, {
      userId,
      accountId: recurring.accountId,
      categoryId: recurring.categoryId,
      amount,
      transactionDate: recurring.nextOccurrence,
      description: recurring.name,
      transactionType: recurring.transactionType,
      source: 'recurring',
      isRecurringInstance: true,
      recurringId: recurring.id,
      isReviewed: true,
    })

    const balanceDelta = recurring.transactionType === 'debit' ? `-${amount}` : amount
    await accountsRepository.adjustBalance(db, recurring.accountId, userId, balanceDelta)

    const nextOccurrence = computeNextOccurrence(
      recurring.nextOccurrence,
      recurring.frequency,
      recurring.dayOfMonth,
      recurring.dayOfWeek,
    )

    await recurringTransactionsRepository.update(db, id, userId, {
      lastOccurrence: recurring.nextOccurrence,
      nextOccurrence,
    })

    return transaction
  },

  async autoGenerate(
    db: Database,
    userId: string,
    asOfDate: string,
  ): Promise<Transaction[]> {
    const due = await recurringTransactionsRepository.findDue(db, userId, asOfDate)
    const generated: Transaction[] = []

    for (const rec of due) {
      if (rec.requiresConfirmation || rec.amountType !== 'fixed' || !rec.amount) {
        continue
      }

      const transaction = await this.generateInstance(db, rec.id, userId, rec.amount)
      generated.push(transaction)
    }

    return generated
  },

  async skip(db: Database, id: string, userId: string): Promise<RecurringTransaction> {
    const recurring = await recurringTransactionsRepository.findById(db, id, userId)
    if (!recurring) {
      throw new NotFoundError('Recurring transaction', id)
    }

    if (!recurring.nextOccurrence) {
      throw new ValidationError('Recurring transaction has no next occurrence')
    }

    const nextOccurrence = computeNextOccurrence(
      recurring.nextOccurrence,
      recurring.frequency,
      recurring.dayOfMonth,
      recurring.dayOfWeek,
    )

    const updated = await recurringTransactionsRepository.update(db, id, userId, {
      nextOccurrence,
    })

    if (!updated) {
      throw new NotFoundError('Recurring transaction', id)
    }

    return updated
  },
}

function computeNextOccurrence(
  fromDate: string,
  frequency: RecurringFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null,
): string {
  const date = new Date(fromDate)

  switch (frequency) {
    case 'weekly': {
      date.setDate(date.getDate() + 7)
      break
    }
    case 'monthly': {
      date.setMonth(date.getMonth() + 1)
      if (dayOfMonth) {
        const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
        date.setDate(Math.min(dayOfMonth, maxDay))
      }
      break
    }
    case 'yearly': {
      date.setFullYear(date.getFullYear() + 1)
      break
    }
  }

  return date.toISOString().split('T')[0]!
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
