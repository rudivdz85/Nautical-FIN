import type { CategorizationRule } from '@fin/core/types'
import type { CreateCategorizationRuleInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestCategorizationRule(
  overrides: Partial<CategorizationRule> = {},
): CategorizationRule {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    categoryId: nextId(),
    merchantExact: null,
    merchantPattern: null,
    descriptionPattern: null,
    amountMin: null,
    amountMax: null,
    priority: 50,
    confidence: '1.00',
    timesApplied: 0,
    timesCorrected: 0,
    isActive: true,
    isGlobal: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestCategorizationRuleInput(
  overrides: Partial<CreateCategorizationRuleInput> = {},
): CreateCategorizationRuleInput {
  return {
    categoryId: nextId(),
    merchantExact: `Test Merchant ${++counter}`,
    ...overrides,
  }
}

export function resetCategorizationRuleFactoryCounters(): void {
  counter = 0
}
