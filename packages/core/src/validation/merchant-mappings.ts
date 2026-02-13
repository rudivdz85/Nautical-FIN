import { z } from 'zod'

export const createMerchantMappingSchema = z.object({
  originalName: z.string().min(1, 'Original name is required').max(200),
  normalizedName: z.string().min(1, 'Normalized name is required').max(200),
  isGlobal: z.boolean().optional().default(false),
})

export const updateMerchantMappingSchema = z
  .object({
    normalizedName: z.string().min(1).max(200).optional(),
    isGlobal: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  })

export type CreateMerchantMappingInput = z.input<typeof createMerchantMappingSchema>
export type UpdateMerchantMappingInput = z.input<typeof updateMerchantMappingSchema>
