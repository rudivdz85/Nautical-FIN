import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { dailyTrackerRepository } from '../repositories/daily-tracker.repository'
import { recurringTransactionsRepository } from '../repositories/recurring-transactions.repository'
import { budgetsRepository } from '../repositories/budgets.repository'
import { accountsRepository } from '../repositories/accounts.repository'
import { transactionsRepository } from '../repositories/transactions.repository'
import {
  createDailyTrackerEntrySchema,
  updateDailyTrackerEntrySchema,
} from '../validation/daily-tracker'
import type { DailyTrackerEntry } from '../types/daily-tracker'
import type { RecurringTransaction } from '../types/recurring-transactions'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const dailyTrackerService = {
  async getRange(
    db: Database,
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyTrackerEntry[]> {
    return dailyTrackerRepository.findByUserAndDateRange(db, userId, startDate, endDate)
  },

  async getByDate(
    db: Database,
    userId: string,
    date: string,
  ): Promise<DailyTrackerEntry | null> {
    const entry = await dailyTrackerRepository.findByUserAndDate(db, userId, date)
    return entry ?? null
  },

  async getById(db: Database, id: string, userId: string): Promise<DailyTrackerEntry> {
    const entry = await dailyTrackerRepository.findById(db, id, userId)
    if (!entry) {
      throw new NotFoundError('DailyTrackerEntry', id)
    }
    return entry
  },

  async create(db: Database, userId: string, input: unknown): Promise<DailyTrackerEntry> {
    const parsed = createDailyTrackerEntrySchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid daily tracker data', parsed.error.issues)
    }

    const data = parsed.data

    const existing = await dailyTrackerRepository.findByUserAndDate(db, userId, data.date)
    if (existing) {
      throw new ValidationError('An entry for this date already exists', {
        date: ['Duplicate tracker date'],
      })
    }

    return dailyTrackerRepository.create(db, {
      userId,
      date: data.date,
      expectedIncome: data.expectedIncome,
      expectedDebtPayments: data.expectedDebtPayments,
      expectedExpenses: data.expectedExpenses,
      predictedSpend: data.predictedSpend,
      manualOverride: data.manualOverride ?? null,
      runningBalance: data.runningBalance,
      hasAlerts: data.hasAlerts,
      alerts: data.alerts ?? null,
      isPayday: data.isPayday,
      incomeDetails: data.incomeDetails ?? null,
      debtDetails: data.debtDetails ?? null,
      expenseDetails: data.expenseDetails ?? null,
    })
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    input: unknown,
  ): Promise<DailyTrackerEntry> {
    const parsed = updateDailyTrackerEntrySchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid daily tracker data', parsed.error.issues)
    }

    const existing = await dailyTrackerRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('DailyTrackerEntry', id)
    }

    const updated = await dailyTrackerRepository.update(db, id, userId, parsed.data)
    if (!updated) {
      throw new NotFoundError('DailyTrackerEntry', id)
    }

    return updated
  },

  async clearRange(
    db: Database,
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<number> {
    return dailyTrackerRepository.deleteByUserAndDateRange(db, userId, startDate, endDate)
  },

  async generateRange(
    db: Database,
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyTrackerEntry[]> {
    const [recurring, budgets, accounts, recentTxns] = await Promise.all([
      recurringTransactionsRepository.findByUserId(db, userId),
      budgetsRepository.findByUserId(db, userId),
      accountsRepository.findByUserId(db, userId),
      transactionsRepository.findByUserId(db, userId, {
        startDate: dateOffset(startDate, -90),
        endDate: startDate,
        transactionType: 'debit',
      }),
    ])

    // Clear existing entries in this range
    await dailyTrackerRepository.deleteByUserAndDateRange(db, userId, startDate, endDate)

    // Compute historical average daily spend from last 90 days of debits
    const totalRecentSpend = recentTxns.reduce(
      (sum, t) => sum + parseFloat(t.amount),
      0,
    )
    const avgDailySpend = recentTxns.length > 0 ? totalRecentSpend / 90 : 0

    // Get active budget for expense estimation
    const activeBudget = budgets.find((b) => b.status === 'active')
    const monthlyPlannedExpenses = parseFloat(activeBudget?.totalPlannedExpenses ?? '0')

    // Starting running balance from spending accounts
    const spendingBalance = accounts
      .filter((a) => a.classification === 'spending')
      .reduce((sum, a) => sum + parseFloat(a.currentBalance), 0)

    const entries: DailyTrackerEntry[] = []
    let runningBalance = spendingBalance
    const current = new Date(startDate + 'T12:00:00')
    const end = new Date(endDate + 'T12:00:00')

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0] ?? ''
      const dayOfMonth = current.getDate()
      const dayOfWeek = current.getDay()
      const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()

      // Compute expected income from recurring credits
      const incomeRecurring = recurring.filter(
        (r) => r.transactionType === 'credit' && matchesDay(r, dayOfMonth, dayOfWeek),
      )
      const expectedIncome = incomeRecurring.reduce(
        (sum, r) => sum + parseFloat(r.amount ?? r.amountMax ?? '0'),
        0,
      )
      const isPayday = expectedIncome > 0

      // Compute expected debt payments from recurring debits
      const debtRecurring = recurring.filter(
        (r) => r.transactionType === 'debit' && matchesDay(r, dayOfMonth, dayOfWeek),
      )
      const expectedDebtPayments = debtRecurring.reduce(
        (sum, r) => sum + parseFloat(r.amount ?? r.amountMax ?? '0'),
        0,
      )

      // Daily expense allocation from budget
      const expectedExpenses = monthlyPlannedExpenses > 0
        ? monthlyPlannedExpenses / daysInMonth
        : 0

      const predictedSpend = avgDailySpend

      runningBalance = runningBalance + expectedIncome - expectedExpenses - expectedDebtPayments - predictedSpend

      const hasAlerts = runningBalance < 0
      const alerts = hasAlerts ? { lowBalance: true, balance: runningBalance.toFixed(2) } : null

      const entry = await dailyTrackerRepository.create(db, {
        userId,
        date: dateStr,
        expectedIncome: expectedIncome.toFixed(2),
        expectedDebtPayments: expectedDebtPayments.toFixed(2),
        expectedExpenses: expectedExpenses.toFixed(2),
        predictedSpend: predictedSpend.toFixed(2),
        manualOverride: null,
        runningBalance: runningBalance.toFixed(2),
        hasAlerts,
        alerts,
        isPayday,
        incomeDetails: incomeRecurring.length > 0
          ? { items: incomeRecurring.map((r) => ({ name: r.name, amount: r.amount ?? r.amountMax })) }
          : null,
        debtDetails: debtRecurring.length > 0
          ? { items: debtRecurring.map((r) => ({ name: r.name, amount: r.amount ?? r.amountMax })) }
          : null,
        expenseDetails: monthlyPlannedExpenses > 0
          ? { dailyBudget: expectedExpenses.toFixed(2), monthlyTotal: monthlyPlannedExpenses.toFixed(2) }
          : null,
      })

      entries.push(entry)
      current.setDate(current.getDate() + 1)
    }

    return entries
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const deleted = await dailyTrackerRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('DailyTrackerEntry', id)
    }
  },
}

function matchesDay(r: RecurringTransaction, dayOfMonth: number, dayOfWeek: number): boolean {
  if (r.frequency === 'monthly') return r.dayOfMonth === dayOfMonth
  if (r.frequency === 'weekly') return r.dayOfWeek === dayOfWeek
  if (r.frequency === 'yearly') return false
  return false
}

function dateOffset(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0] ?? ''
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
