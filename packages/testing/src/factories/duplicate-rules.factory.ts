import type { DuplicateRule } from '@fin/core/types'
import type { CreateDuplicateRuleInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestDuplicateRule(
  overrides: Partial<DuplicateRule> = {},
): DuplicateRule {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    merchantPattern: null,
    amount: null,
    action: 'skip',
    createdAt: new Date(),
    ...overrides,
  }
}

export function createTestDuplicateRuleInput(
  overrides: Partial<CreateDuplicateRuleInput> = {},
): CreateDuplicateRuleInput {
  return {
    merchantPattern: `MERCHANT ${++counter}*`,
    action: 'skip',
    ...overrides,
  }
}

export function resetDuplicateRuleFactoryCounters(): void {
  counter = 0
}
