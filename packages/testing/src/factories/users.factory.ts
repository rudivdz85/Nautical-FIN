import type { User, UserPreferences } from '@fin/core/types'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

const DEFAULT_PREFERENCES: UserPreferences = {
  financialMonthStartDay: 25,
  defaultCurrency: 'ZAR',
  theme: 'system',
  budgetRedistribution: 'even',
  notifications: {
    inApp: true,
    push: true,
    desktop: true,
    email: false,
  },
}

export function createTestUser(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? nextId()
  return {
    id,
    clerkId: `clerk_${id}`,
    email: `user-${id}@test.com`,
    displayName: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    preferences: DEFAULT_PREFERENCES,
    onboardingCompleted: false,
    isSalaried: null,
    ...overrides,
  }
}

export function resetUserFactoryCounters(): void {
  counter = 0
}
