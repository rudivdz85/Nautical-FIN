import { z } from 'zod'

const decimalString = z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'Must be a valid decimal')

export const createCategorizationRuleSchema = z
  .object({
    categoryId: z.string().uuid(),
    merchantExact: z.string().max(200).nullish(),
    merchantPattern: z.string().max(200).nullish(),
    descriptionPattern: z.string().max(200).nullish(),
    amountMin: decimalString.nullish(),
    amountMax: decimalString.nullish(),
    priority: z.number().int().min(0).max(100).optional().default(50),
    confidence: decimalString.optional().default('1.00'),
    isGlobal: z.boolean().optional().default(false),
  })
  .refine(
    (data) => data.merchantExact || data.merchantPattern || data.descriptionPattern,
    { message: 'At least one matching criterion is required (merchantExact, merchantPattern, or descriptionPattern)' },
  )

export const updateCategorizationRuleSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    merchantExact: z.string().max(200).nullish(),
    merchantPattern: z.string().max(200).nullish(),
    descriptionPattern: z.string().max(200).nullish(),
    amountMin: decimalString.nullish(),
    amountMax: decimalString.nullish(),
    priority: z.number().int().min(0).max(100).optional(),
    confidence: decimalString.optional(),
    isActive: z.boolean().optional(),
    isGlobal: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  })

export type CreateCategorizationRuleInput = z.input<typeof createCategorizationRuleSchema>
export type UpdateCategorizationRuleInput = z.input<typeof updateCategorizationRuleSchema>
