import { z } from 'zod'

const decimalString = z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'Must be a valid decimal')
const duplicateAction = z.enum(['allow', 'skip', 'flag'])

export const createDuplicateRuleSchema = z
  .object({
    merchantPattern: z.string().max(200).nullish(),
    amount: decimalString.nullish(),
    action: duplicateAction,
  })
  .refine(
    (data) => data.merchantPattern || data.amount,
    { message: 'At least one matching criterion is required (merchantPattern or amount)' },
  )

export const updateDuplicateRuleSchema = z
  .object({
    merchantPattern: z.string().max(200).nullish(),
    amount: decimalString.nullish(),
    action: duplicateAction.optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  })

export type CreateDuplicateRuleInput = z.input<typeof createDuplicateRuleSchema>
export type UpdateDuplicateRuleInput = z.input<typeof updateDuplicateRuleSchema>
