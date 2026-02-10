import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  categoryType: z.enum(['income', 'expense']),
  parentId: z.string().uuid().optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional(),
  displayOrder: z.number().int().min(0).optional(),
})

export const updateCategorySchema = z
  .object({
    name: z.string().min(1, 'Category name is required').max(50).optional(),
    icon: z.string().max(50).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color')
      .nullable()
      .optional(),
    isHidden: z.boolean().optional(),
    displayOrder: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
