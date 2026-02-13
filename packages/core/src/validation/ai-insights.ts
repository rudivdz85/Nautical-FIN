import { z } from 'zod'

export const createAiInsightSchema = z.object({
  insightType: z.string().min(1, 'Insight type is required').max(50),
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  relatedEntityType: z.string().max(50).nullish(),
  relatedEntityId: z.string().uuid().nullish(),
  priority: z.number().int().min(1).max(10).optional(),
  validUntil: z.string().datetime().nullish(),
  metadata: z.record(z.unknown()).nullish(),
})

export const updateAiInsightSchema = z
  .object({
    isRead: z.boolean().optional(),
    isDismissed: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export type CreateAiInsightInput = z.infer<typeof createAiInsightSchema>
export type UpdateAiInsightInput = z.infer<typeof updateAiInsightSchema>
