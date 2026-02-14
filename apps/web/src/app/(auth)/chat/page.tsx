import type { UIMessage } from 'ai'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { chatMessagesService } from '@fin/core/services'
import { ChatPageClient } from './chat-page-client'

export default async function ChatPage() {
  const user = await getAuthenticatedUser()
  const dbMessages = await chatMessagesService.list(db, user.id, 50)

  const initialMessages: UIMessage[] = dbMessages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    parts: [{ type: 'text' as const, text: m.content }],
  }))

  return <ChatPageClient initialMessages={initialMessages} />
}
