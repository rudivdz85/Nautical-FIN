import type { chatMessages } from '../db/schema'

export type ChatMessage = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert

export type ChatRole = 'user' | 'assistant' | 'system'
