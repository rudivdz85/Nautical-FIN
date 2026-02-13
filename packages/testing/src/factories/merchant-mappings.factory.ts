import type { MerchantMapping } from '@fin/core/types'
import type { CreateMerchantMappingInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestMerchantMapping(
  overrides: Partial<MerchantMapping> = {},
): MerchantMapping {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    originalName: `ORIGINAL MERCHANT ${counter}`,
    normalizedName: `Merchant ${counter}`,
    isGlobal: false,
    createdAt: new Date(),
    ...overrides,
  }
}

export function createTestMerchantMappingInput(
  overrides: Partial<CreateMerchantMappingInput> = {},
): CreateMerchantMappingInput {
  counter++
  return {
    originalName: `ORIGINAL MERCHANT ${counter}`,
    normalizedName: `Merchant ${counter}`,
    ...overrides,
  }
}

export function resetMerchantMappingFactoryCounters(): void {
  counter = 0
}
