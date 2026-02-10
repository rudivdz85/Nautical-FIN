import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { usersRepository } from '../repositories/users.repository'
import { subscriptionsRepository } from '../repositories/subscriptions.repository'
import { categoriesRepository } from '../repositories/categories.repository'
import { updatePreferencesSchema, completeOnboardingSchema } from '../validation/users'
import type { User, UserPreferences } from '../types/users'
import { NotFoundError, ConflictError, ValidationError } from '../errors/index'
import { ALL_DEFAULT_CATEGORIES } from './default-categories'

type Database = NeonHttpDatabase

const TRIAL_DURATION_DAYS = 14

export const usersService = {
  async getById(db: Database, id: string): Promise<User> {
    const user = await usersRepository.findById(db, id)
    if (!user) {
      throw new NotFoundError('User', id)
    }
    return user
  },

  async getByClerkId(db: Database, clerkId: string): Promise<User> {
    const user = await usersRepository.findByClerkId(db, clerkId)
    if (!user) {
      throw new NotFoundError('User')
    }
    return user
  },

  async createFromWebhook(
    db: Database,
    clerkId: string,
    email: string,
    displayName?: string,
  ): Promise<User> {
    const existing = await usersRepository.findByClerkId(db, clerkId)
    if (existing) {
      throw new ConflictError('User already exists')
    }

    const user = await usersRepository.create(db, {
      clerkId,
      email,
      displayName: displayName ?? null,
    })

    const now = new Date()
    const trialEnd = new Date(now)
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS)

    await subscriptionsRepository.create(db, {
      userId: user.id,
      tier: 'trial',
      trialStartDate: now,
      trialEndDate: trialEnd,
    })

    await categoriesRepository.bulkCreate(
      db,
      ALL_DEFAULT_CATEGORIES.map((cat) => ({
        userId: user.id,
        name: cat.name,
        categoryType: cat.categoryType,
        icon: cat.icon,
        isSystem: true,
        displayOrder: cat.displayOrder,
      })),
    )

    return user
  },

  async updateFromWebhook(
    db: Database,
    clerkId: string,
    email: string,
    displayName?: string,
  ): Promise<User | undefined> {
    return usersRepository.updateByClerkId(db, clerkId, {
      email,
      displayName: displayName ?? null,
    })
  },

  async deleteByClerkId(db: Database, clerkId: string): Promise<boolean> {
    return usersRepository.deleteByClerkId(db, clerkId)
  },

  async updatePreferences(
    db: Database,
    userId: string,
    input: unknown,
  ): Promise<User> {
    const parsed = updatePreferencesSchema.safeParse(input)
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) {
          fieldErrors[path] = []
        }
        fieldErrors[path].push(issue.message)
      }
      throw new ValidationError('Invalid preferences', fieldErrors)
    }

    const user = await usersRepository.findById(db, userId)
    if (!user) {
      throw new NotFoundError('User', userId)
    }

    const currentPrefs = user.preferences as UserPreferences
    const merged: UserPreferences = {
      ...currentPrefs,
      ...parsed.data,
      notifications: {
        ...currentPrefs.notifications,
        ...(parsed.data.notifications ?? {}),
      },
    }

    const updated = await usersRepository.updatePreferences(db, userId, merged)
    if (!updated) {
      throw new NotFoundError('User', userId)
    }
    return updated
  },

  async completeOnboarding(
    db: Database,
    userId: string,
    input: unknown,
  ): Promise<User> {
    const parsed = completeOnboardingSchema.safeParse(input)
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) {
          fieldErrors[path] = []
        }
        fieldErrors[path].push(issue.message)
      }
      throw new ValidationError('Invalid onboarding data', fieldErrors)
    }

    const user = await usersRepository.findById(db, userId)
    if (!user) {
      throw new NotFoundError('User', userId)
    }

    const currentPrefs = user.preferences as UserPreferences
    const updatedPrefs: UserPreferences = {
      ...currentPrefs,
      financialMonthStartDay: parsed.data.financialMonthStartDay,
      defaultCurrency: parsed.data.defaultCurrency,
    }

    await usersRepository.updatePreferences(db, userId, updatedPrefs)

    const updated = await usersRepository.update(db, userId, {
      isSalaried: parsed.data.isSalaried,
      onboardingCompleted: true,
    })

    if (!updated) {
      throw new NotFoundError('User', userId)
    }
    return updated
  },
}
