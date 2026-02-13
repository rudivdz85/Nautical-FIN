import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { debtsRepository } from '../repositories/debts.repository'
import { debtPaymentsRepository } from '../repositories/debt-payments.repository'
import { accountsRepository } from '../repositories/accounts.repository'
import {
  createDebtSchema,
  updateDebtSchema,
  createDebtPaymentSchema,
  updateDebtPaymentSchema,
} from '../validation/debts'
import type { Debt, DebtPayment, DebtWithPayments } from '../types/debts'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const debtsService = {
  async list(db: Database, userId: string): Promise<Debt[]> {
    return debtsRepository.findByUserId(db, userId)
  },

  async listAll(db: Database, userId: string): Promise<Debt[]> {
    return debtsRepository.findAllByUserId(db, userId)
  },

  async getById(db: Database, id: string, userId: string): Promise<DebtWithPayments> {
    const debt = await debtsRepository.findById(db, id, userId)
    if (!debt) {
      throw new NotFoundError('Debt', id)
    }

    const payments = await debtPaymentsRepository.findByDebtId(db, id)

    return { ...debt, payments }
  },

  async create(db: Database, userId: string, input: unknown): Promise<Debt> {
    const parsed = createDebtSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid debt data', parsed.error.issues)
    }

    const data = parsed.data

    if (data.linkedAccountId) {
      const account = await accountsRepository.findById(db, data.linkedAccountId, userId)
      if (!account) {
        throw new NotFoundError('Account', data.linkedAccountId)
      }
    }

    return debtsRepository.create(db, {
      userId,
      linkedAccountId: data.linkedAccountId,
      name: data.name,
      debtType: data.debtType,
      creditor: data.creditor,
      originalAmount: data.originalAmount,
      currentBalance: data.currentBalance,
      interestRate: data.interestRate,
      interestType: data.interestType,
      minimumPayment: data.minimumPayment,
      fixedPayment: data.fixedPayment,
      paymentDay: data.paymentDay,
      startDate: data.startDate,
      expectedPayoffDate: data.expectedPayoffDate,
      notes: data.notes,
    })
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    input: unknown,
  ): Promise<Debt> {
    const parsed = updateDebtSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid debt data', parsed.error.issues)
    }

    const existing = await debtsRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('Debt', id)
    }

    const data = parsed.data

    if (data.linkedAccountId) {
      const account = await accountsRepository.findById(db, data.linkedAccountId, userId)
      if (!account) {
        throw new NotFoundError('Account', data.linkedAccountId)
      }
    }

    const updated = await debtsRepository.update(db, id, userId, data)
    if (!updated) {
      throw new NotFoundError('Debt', id)
    }

    return updated
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const deleted = await debtsRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('Debt', id)
    }
  },

  // Debt Payments

  async listPayments(db: Database, debtId: string, userId: string): Promise<DebtPayment[]> {
    const debt = await debtsRepository.findById(db, debtId, userId)
    if (!debt) {
      throw new NotFoundError('Debt', debtId)
    }

    return debtPaymentsRepository.findByDebtId(db, debtId)
  },

  async addPayment(
    db: Database,
    debtId: string,
    userId: string,
    input: unknown,
  ): Promise<DebtPayment> {
    const parsed = createDebtPaymentSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid payment data', parsed.error.issues)
    }

    const debt = await debtsRepository.findById(db, debtId, userId)
    if (!debt) {
      throw new NotFoundError('Debt', debtId)
    }

    const data = parsed.data

    const balanceAfter = subtract(parseFloat(debt.currentBalance), parseFloat(data.amount))

    const payment = await debtPaymentsRepository.create(db, {
      debtId,
      amount: data.amount,
      principalAmount: data.principalAmount,
      interestAmount: data.interestAmount,
      paymentDate: data.paymentDate,
      transactionId: data.transactionId,
      balanceAfter: balanceAfter.toFixed(2),
    })

    await debtsRepository.update(db, debtId, userId, {
      currentBalance: balanceAfter.toFixed(2),
    })

    return payment
  },

  async updatePayment(
    db: Database,
    debtId: string,
    paymentId: string,
    userId: string,
    input: unknown,
  ): Promise<DebtPayment> {
    const parsed = updateDebtPaymentSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid payment data', parsed.error.issues)
    }

    const debt = await debtsRepository.findById(db, debtId, userId)
    if (!debt) {
      throw new NotFoundError('Debt', debtId)
    }

    const existing = await debtPaymentsRepository.findById(db, paymentId, debtId)
    if (!existing) {
      throw new NotFoundError('DebtPayment', paymentId)
    }

    const data = parsed.data

    // If amount changed, adjust debt balance
    if (data.amount && data.amount !== existing.amount) {
      const oldAmount = parseFloat(existing.amount)
      const newAmount = parseFloat(data.amount)
      const currentBalance = parseFloat(debt.currentBalance)
      const adjustedBalance = currentBalance + oldAmount - newAmount

      await debtsRepository.update(db, debtId, userId, {
        currentBalance: adjustedBalance.toFixed(2),
      })
    }

    const updated = await debtPaymentsRepository.update(db, paymentId, debtId, data)
    if (!updated) {
      throw new NotFoundError('DebtPayment', paymentId)
    }

    return updated
  },

  async removePayment(
    db: Database,
    debtId: string,
    paymentId: string,
    userId: string,
  ): Promise<void> {
    const debt = await debtsRepository.findById(db, debtId, userId)
    if (!debt) {
      throw new NotFoundError('Debt', debtId)
    }

    const payment = await debtPaymentsRepository.findById(db, paymentId, debtId)
    if (!payment) {
      throw new NotFoundError('DebtPayment', paymentId)
    }

    // Reverse the balance adjustment
    const restoredBalance = parseFloat(debt.currentBalance) + parseFloat(payment.amount)

    await debtPaymentsRepository.delete(db, paymentId, debtId)

    await debtsRepository.update(db, debtId, userId, {
      currentBalance: restoredBalance.toFixed(2),
    })
  },
}

function subtract(a: number, b: number): number {
  return Math.round((a - b) * 100) / 100
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
