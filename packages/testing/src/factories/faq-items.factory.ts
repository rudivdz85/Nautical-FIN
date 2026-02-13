import type { FaqItem } from '@fin/core/types'
import type { CreateFaqItemInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestFaqItem(
  overrides: Partial<FaqItem> = {},
): FaqItem {
  const id = overrides.id ?? nextId()
  const num = counter
  return {
    id,
    question: `What is feature ${num}?`,
    answer: `Feature ${num} helps you manage your finances.`,
    category: 'general',
    slug: `what-is-feature-${num}`,
    displayOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestFaqItemInput(
  overrides: Partial<CreateFaqItemInput> = {},
): CreateFaqItemInput {
  return {
    question: 'How does budgeting work?',
    answer: 'You create a monthly budget and track spending against it.',
    category: 'budgets',
    slug: 'how-does-budgeting-work',
    ...overrides,
  }
}

export function resetFaqItemFactoryCounters(): void {
  counter = 0
}
