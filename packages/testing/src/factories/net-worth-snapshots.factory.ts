import type { NetWorthSnapshot } from '@fin/core/types'
import type { CreateNetWorthSnapshotInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestNetWorthSnapshot(
  overrides: Partial<NetWorthSnapshot> = {},
): NetWorthSnapshot {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    snapshotDate: '2025-02-01',
    totalAssets: '50000.00',
    totalLiabilities: '20000.00',
    netWorth: '30000.00',
    totalCashSpend: null,
    totalCreditAvailable: null,
    totalSavings: null,
    totalDebt: null,
    breakdown: null,
    createdAt: new Date(),
    ...overrides,
  }
}

export function createTestNetWorthSnapshotInput(
  overrides: Partial<CreateNetWorthSnapshotInput> = {},
): CreateNetWorthSnapshotInput {
  return {
    snapshotDate: '2025-02-01',
    totalAssets: '50000.00',
    totalLiabilities: '20000.00',
    netWorth: '30000.00',
    ...overrides,
  }
}

export function resetNetWorthSnapshotFactoryCounters(): void {
  counter = 0
}
