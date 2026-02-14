import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { netWorthSnapshotsRepository } from '../repositories/net-worth-snapshots.repository'
import { accountsRepository } from '../repositories/accounts.repository'
import { debtsRepository } from '../repositories/debts.repository'
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

  async generateSnapshot(db: Database, userId: string): Promise<NetWorthSnapshot> {
    const [accounts, debts] = await Promise.all([
      accountsRepository.findByUserId(db, userId),
      debtsRepository.findByUserId(db, userId),
    ])

    const totalAssets = accounts.reduce(
      (sum, a) => sum + parseFloat(a.currentBalance),
      0,
    )

    const totalLiabilities = debts.reduce(
      (sum, d) => sum + parseFloat(d.currentBalance),
      0,
    )

    const netWorth = totalAssets - totalLiabilities

    const totalCashSpend = accounts
      .filter((a) => a.classification === 'spending')
      .reduce((sum, a) => sum + parseFloat(a.currentBalance), 0)

    const totalSavings = accounts
      .filter((a) => a.accountType === 'savings')
      .reduce((sum, a) => sum + parseFloat(a.currentBalance), 0)

    const totalCreditAvailable = accounts
      .filter((a) => a.accountType === 'credit_card' && a.creditLimit)
      .reduce(
        (sum, a) => sum + (parseFloat(a.creditLimit ?? '0') - parseFloat(a.currentBalance)),
        0,
      )

    const today = new Date().toISOString().split('T')[0] ?? ''

    // Upsert: delete existing snapshot for today if it exists
    const existing = await netWorthSnapshotsRepository.findByDate(db, userId, today)
    if (existing) {
      await netWorthSnapshotsRepository.delete(db, existing.id, userId)
    }

    const breakdown = {
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.accountType,
        classification: a.classification,
        balance: a.currentBalance,
      })),
      debts: debts.map((d) => ({
        id: d.id,
        name: d.name,
        balance: d.currentBalance,
      })),
    }

    return netWorthSnapshotsRepository.create(db, {
      userId,
      snapshotDate: today,
      totalAssets: totalAssets.toFixed(2),
      totalLiabilities: totalLiabilities.toFixed(2),
      netWorth: netWorth.toFixed(2),
      totalCashSpend: totalCashSpend.toFixed(2),
      totalCreditAvailable: totalCreditAvailable.toFixed(2),
      totalSavings: totalSavings.toFixed(2),
      totalDebt: totalLiabilities.toFixed(2),
      breakdown,
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
