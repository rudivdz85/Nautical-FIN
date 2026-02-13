import type { AiInsight } from '@fin/core/types'
import type { CreateAiInsightInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestAiInsight(
  overrides: Partial<AiInsight> = {},
): AiInsight {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    insightType: 'monthly_checkin',
    title: 'Monthly Check-In: February 2025',
    content: 'You spent 15% less on dining out this month. Great progress!',
    relatedEntityType: null,
    relatedEntityId: null,
    priority: 5,
    isRead: false,
    isDismissed: false,
    validUntil: null,
    metadata: null,
    createdAt: new Date(),
    ...overrides,
  }
}

export function createTestAiInsightInput(
  overrides: Partial<CreateAiInsightInput> = {},
): CreateAiInsightInput {
  return {
    insightType: 'monthly_checkin',
    title: 'Monthly Check-In: February 2025',
    content: 'You spent 15% less on dining out this month. Great progress!',
    ...overrides,
  }
}

export function resetAiInsightFactoryCounters(): void {
  counter = 0
}
