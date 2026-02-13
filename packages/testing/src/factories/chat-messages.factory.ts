import type { ChatMessage } from '@fin/core/types'
import type { CreateChatMessageInput } from '@fin/core/validation'

let counter = 0

function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function createTestChatMessage(
  overrides: Partial<ChatMessage> = {},
): ChatMessage {
  const id = overrides.id ?? nextId()
  return {
    id,
    userId: nextId(),
    role: 'user',
    content: 'Hello, how much did I spend on groceries?',
    intent: null,
    entities: null,
    actionTaken: null,
    actionResult: null,
    createdAt: new Date(),
    ...overrides,
  }
}

export function createTestChatMessageInput(
  overrides: Partial<CreateChatMessageInput> = {},
): CreateChatMessageInput {
  return {
    role: 'user',
    content: 'Hello, how much did I spend on groceries?',
    ...overrides,
  }
}

export function resetChatMessageFactoryCounters(): void {
  counter = 0
}
