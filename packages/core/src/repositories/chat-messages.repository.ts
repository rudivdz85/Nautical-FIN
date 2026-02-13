import { eq, and, desc } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { chatMessages } from '../db/schema'
import type { ChatMessage, NewChatMessage } from '../types/chat-messages'

type Database = NeonHttpDatabase

export const chatMessagesRepository = {
  async findByUserId(
    db: Database,
    userId: string,
    limit: number,
    offset: number,
  ): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .offset(offset)
  },

  async findById(db: Database, id: string, userId: string): Promise<ChatMessage | undefined> {
    const results = await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.id, id), eq(chatMessages.userId, userId)))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewChatMessage): Promise<ChatMessage> {
    const results = await db.insert(chatMessages).values(data).returning()
    return results[0]!
  },

  async deleteByUserId(db: Database, userId: string): Promise<number> {
    const results = await db
      .delete(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .returning({ id: chatMessages.id })

    return results.length
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(chatMessages)
      .where(and(eq(chatMessages.id, id), eq(chatMessages.userId, userId)))
      .returning({ id: chatMessages.id })

    return results.length > 0
  },
}
