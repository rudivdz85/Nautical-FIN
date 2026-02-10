import type { Category, CategoryType } from '@fin/core/types'
import type { CreateCategoryInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestCategory(overrides: Partial<Category> = {}): Category {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    name: 'Test Category',
    categoryType: 'expense',
    parentId: null,
    icon: 'tag',
    color: null,
    isSystem: false,
    isHidden: false,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestCategoryInput(
  overrides: Partial<CreateCategoryInput> = {},
): CreateCategoryInput {
  return {
    name: 'Test Category',
    categoryType: 'expense',
    ...overrides,
  }
}

export function resetCategoryFactoryCounters(): void {
  counter = 0
}
