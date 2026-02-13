import { z } from 'zod'

export const createFaqItemSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500),
  answer: z.string().min(1, 'Answer is required'),
  category: z.string().min(1, 'Category is required').max(50),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const updateFaqItemSchema = z
  .object({
    question: z.string().min(1).max(500).optional(),
    answer: z.string().min(1).optional(),
    category: z.string().min(1).max(50).optional(),
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
      .optional(),
    displayOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export type CreateFaqItemInput = z.infer<typeof createFaqItemSchema>
export type UpdateFaqItemInput = z.infer<typeof updateFaqItemSchema>
