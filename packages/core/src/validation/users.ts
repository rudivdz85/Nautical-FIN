import { z } from 'zod'

export const updatePreferencesSchema = z.object({
  financialMonthStartDay: z.number().int().min(1).max(28).optional(),
  defaultCurrency: z.string().length(3).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  budgetRedistribution: z.enum(['even', 'weekly', 'weighted']).optional(),
  notifications: z
    .object({
      inApp: z.boolean(),
      push: z.boolean(),
      desktop: z.boolean(),
      email: z.boolean(),
    })
    .optional(),
})

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>

export const completeOnboardingSchema = z.object({
  financialMonthStartDay: z.number().int().min(1).max(28),
  defaultCurrency: z.string().length(3).default('ZAR'),
  isSalaried: z.boolean(),
})

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>
