import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { accountsRepository } from '../repositories/accounts.repository'
import { createAccountSchema, updateAccountSchema } from '../validation/accounts'
import type { CreateAccountInput, UpdateAccountInput } from '../validation/accounts'
import type { Account } from '../types/accounts'
import {
  ACCOUNT_TYPE_CLASSIFICATION_DEFAULTS,
  ALWAYS_NON_SPENDING_TYPES,
} from '../types/accounts'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const accountsService = {
  async list(db: Database, userId: string): Promise<Account[]> {
    return accountsRepository.findByUserId(db, userId)
  },

  async getById(db: Database, id: string, userId: string): Promise<Account> {
    const account = await accountsRepository.findById(db, id, userId)
    if (!account) {
      throw new NotFoundError('Account', id)
    }
    return account
  },

  async create(db: Database, userId: string, input: unknown): Promise<Account> {
    const parsed = createAccountSchema.safeParse(input)
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) {
          fieldErrors[path] = []
        }
        fieldErrors[path].push(issue.message)
      }
      throw new ValidationError('Invalid account data', fieldErrors)
    }

    const data = parsed.data
    const classification = resolveClassification(data.accountType, data.classification)

    const isFirstAccount = (await accountsRepository.countByUserId(db, userId)) === 0

    return accountsRepository.create(db, {
      userId,
      name: data.name,
      accountType: data.accountType,
      classification,
      institution: data.institution,
      accountNumberMasked: data.accountNumberMasked,
      currency: data.currency,
      currentBalance: data.currentBalance,
      balanceAsOfDate: data.balanceAsOfDate,
      creditLimit: data.creditLimit,
      isFirstAccount,
      displayOrder: data.displayOrder ?? 0,
    })
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    input: unknown,
  ): Promise<Account> {
    const parsed = updateAccountSchema.safeParse(input)
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) {
          fieldErrors[path] = []
        }
        fieldErrors[path].push(issue.message)
      }
      throw new ValidationError('Invalid account data', fieldErrors)
    }

    const existing = await accountsRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('Account', id)
    }

    const data = parsed.data
    if (data.accountType) {
      data.classification = resolveClassification(
        data.accountType,
        data.classification,
      )
    }

    const updated = await accountsRepository.update(db, id, userId, data)
    if (!updated) {
      throw new NotFoundError('Account', id)
    }

    return updated
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const deleted = await accountsRepository.softDelete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('Account', id)
    }
  },
}

function resolveClassification(
  accountType: CreateAccountInput['accountType'],
  explicitClassification?: 'spending' | 'non_spending',
): 'spending' | 'non_spending' {
  if (ALWAYS_NON_SPENDING_TYPES.has(accountType)) {
    return 'non_spending'
  }
  return explicitClassification ?? ACCOUNT_TYPE_CLASSIFICATION_DEFAULTS[accountType]
}
