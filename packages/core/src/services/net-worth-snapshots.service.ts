import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { netWorthSnapshotsRepository } from '../repositories/net-worth-snapshots.repository'
import { createNetWorthSnapshotSchema } from '../validation/net-worth-snapshots'
import type { NetWorthSnapshot } from '../types/net-worth-snapshots'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const netWorthSnapshotsService = {
  async list(db: Database, userId: string): Promise<NetWorthSnapshot[]> {
    return netWorthSnapshotsRepository.findByUserId(db, userId)
  },

  async getById(db: Database, id: string, userId: string): Promise<NetWorthSnapshot> {
    const snapshot = await netWorthSnapshotsRepository.findById(db, id, userId)
    if (!snapshot) {
      throw new NotFoundError('NetWorthSnapshot', id)
    }
    return snapshot
  },

  async getLatest(db: Database, userId: string): Promise<NetWorthSnapshot | null> {
    const snapshot = await netWorthSnapshotsRepository.findLatest(db, userId)
    return snapshot ?? null
  },

  async create(db: Database, userId: string, input: unknown): Promise<NetWorthSnapshot> {
    const parsed = createNetWorthSnapshotSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid net worth snapshot data', parsed.error.issues)
    }

    const data = parsed.data

    const existing = await netWorthSnapshotsRepository.findByDate(db, userId, data.snapshotDate)
    if (existing) {
      throw new ValidationError('A snapshot for this date already exists', {
        snapshotDate: ['Duplicate snapshot date'],
      })
    }

    return netWorthSnapshotsRepository.create(db, {
      userId,
      snapshotDate: data.snapshotDate,
      totalAssets: data.totalAssets,
      totalLiabilities: data.totalLiabilities,
      netWorth: data.netWorth,
      totalCashSpend: data.totalCashSpend ?? null,
      totalCreditAvailable: data.totalCreditAvailable ?? null,
      totalSavings: data.totalSavings ?? null,
      totalDebt: data.totalDebt ?? null,
      breakdown: data.breakdown ?? null,
    })
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const deleted = await netWorthSnapshotsRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('NetWorthSnapshot', id)
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
