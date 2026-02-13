import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { dailyTrackerRepository } from '../repositories/daily-tracker.repository'
import {
  createDailyTrackerEntrySchema,
  updateDailyTrackerEntrySchema,
} from '../validation/daily-tracker'
import type { DailyTrackerEntry } from '../types/daily-tracker'
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

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const deleted = await dailyTrackerRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('DailyTrackerEntry', id)
    }
  },
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
