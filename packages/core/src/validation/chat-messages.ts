import { z } from 'zod'

export const createChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Content is required'),
  intent: z.string().max(50).nullish(),
  entities: z.record(z.unknown()).nullish(),
  actionTaken: z.string().max(100).nullish(),
  actionResult: z.record(z.unknown()).nullish(),
})

export type CreateChatMessageInput = z.infer<typeof createChatMessageSchema>
