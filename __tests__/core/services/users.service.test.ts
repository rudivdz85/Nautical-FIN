import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usersService } from '../../../packages/core/src/services/users.service'
import { usersRepository } from '../../../packages/core/src/repositories/users.repository'
import { subscriptionsRepository } from '../../../packages/core/src/repositories/subscriptions.repository'
import { categoriesRepository } from '../../../packages/core/src/repositories/categories.repository'
import { NotFoundError, ConflictError, ValidationError } from '../../../packages/core/src/errors/index'
import type { User } from '../../../packages/core/src/types/users'
import type { Subscription } from '../../../packages/core/src/types/users'
import type { Category } from '../../../packages/core/src/types/categories'
import { ALL_DEFAULT_CATEGORIES } from '../../../packages/core/src/services/default-categories'

vi.mock('../../../packages/core/src/repositories/users.repository', () => ({
  usersRepository: {
    findByClerkId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateByClerkId: vi.fn(),
    updatePreferences: vi.fn(),
    deleteByClerkId: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/subscriptions.repository', () => ({
  subscriptionsRepository: {
    findByUserId: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/categories.repository', () => ({
  categoriesRepository: {
    bulkCreate: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof usersService.getById>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_CLERK_ID = 'clerk_test_123'

const DEFAULT_PREFERENCES = {
  financialMonthStartDay: 25,
  defaultCurrency: 'ZAR',
  theme: 'system' as const,
  budgetRedistribution: 'even' as const,
  notifications: {
    inApp: true,
    push: true,
    desktop: true,
    email: false,
  },
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: TEST_USER_ID,
    clerkId: TEST_CLERK_ID,
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    preferences: DEFAULT_PREFERENCES,
    onboardingCompleted: false,
    isSalaried: null,
    ...overrides,
  }
}

describe('usersService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getById', () => {
    it('returns user when found', async () => {
      const user = makeUser()
      vi.mocked(usersRepository.findById).mockResolvedValue(user)

      const result = await usersService.getById(mockDb, TEST_USER_ID)

      expect(result).toEqual(user)
      expect(usersRepository.findById).toHaveBeenCalledWith(mockDb, TEST_USER_ID)
    })

    it('throws NotFoundError when user does not exist', async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(undefined)

      await expect(usersService.getById(mockDb, 'nonexistent')).rejects.toThrow(NotFoundError)
    })
  })

  describe('getByClerkId', () => {
    it('returns user when found', async () => {
      const user = makeUser()
      vi.mocked(usersRepository.findByClerkId).mockResolvedValue(user)

      const result = await usersService.getByClerkId(mockDb, TEST_CLERK_ID)

      expect(result).toEqual(user)
    })

    it('throws NotFoundError when user does not exist', async () => {
      vi.mocked(usersRepository.findByClerkId).mockResolvedValue(undefined)

      await expect(usersService.getByClerkId(mockDb, 'unknown')).rejects.toThrow(NotFoundError)
    })
  })

  describe('createFromWebhook', () => {
    it('creates user with trial subscription and default categories', async () => {
      const user = makeUser()
      vi.mocked(usersRepository.findByClerkId).mockResolvedValue(undefined)
      vi.mocked(usersRepository.create).mockResolvedValue(user)
      vi.mocked(subscriptionsRepository.create).mockResolvedValue({} as Subscription)
      vi.mocked(categoriesRepository.bulkCreate).mockResolvedValue([] as Category[])

      const result = await usersService.createFromWebhook(
        mockDb,
        TEST_CLERK_ID,
        'test@example.com',
        'Test User',
      )

      expect(result).toEqual(user)
      expect(usersRepository.create).toHaveBeenCalledWith(mockDb, {
        clerkId: TEST_CLERK_ID,
        email: 'test@example.com',
        displayName: 'Test User',
      })
    })

    it('creates trial subscription with 14-day duration', async () => {
      const user = makeUser()
      vi.mocked(usersRepository.findByClerkId).mockResolvedValue(undefined)
      vi.mocked(usersRepository.create).mockResolvedValue(user)
      vi.mocked(subscriptionsRepository.create).mockResolvedValue({} as Subscription)
      vi.mocked(categoriesRepository.bulkCreate).mockResolvedValue([] as Category[])

      await usersService.createFromWebhook(mockDb, TEST_CLERK_ID, 'test@example.com')

      expect(subscriptionsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          tier: 'trial',
        }),
      )

      const createCall = vi.mocked(subscriptionsRepository.create).mock.calls[0]!
      const trialStart = createCall[1].trialStartDate as Date
      const trialEnd = createCall[1].trialEndDate as Date
      const diffDays = Math.round(
        (trialEnd.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24),
      )
      expect(diffDays).toBe(14)
    })

    it('seeds all default categories for new user', async () => {
      const user = makeUser()
      vi.mocked(usersRepository.findByClerkId).mockResolvedValue(undefined)
      vi.mocked(usersRepository.create).mockResolvedValue(user)
      vi.mocked(subscriptionsRepository.create).mockResolvedValue({} as Subscription)
      vi.mocked(categoriesRepository.bulkCreate).mockResolvedValue([] as Category[])

      await usersService.createFromWebhook(mockDb, TEST_CLERK_ID, 'test@example.com')

      expect(categoriesRepository.bulkCreate).toHaveBeenCalledWith(
        mockDb,
        expect.arrayContaining([
          expect.objectContaining({
            userId: TEST_USER_ID,
            name: 'Groceries',
            categoryType: 'expense',
            isSystem: true,
          }),
          expect.objectContaining({
            userId: TEST_USER_ID,
            name: 'Salary',
            categoryType: 'income',
            isSystem: true,
          }),
        ]),
      )

      const bulkCreateCall = vi.mocked(categoriesRepository.bulkCreate).mock.calls[0]!
      expect(bulkCreateCall[1]).toHaveLength(ALL_DEFAULT_CATEGORIES.length)
    })

    it('sets displayName to null when not provided', async () => {
      const user = makeUser({ displayName: null })
      vi.mocked(usersRepository.findByClerkId).mockResolvedValue(undefined)
      vi.mocked(usersRepository.create).mockResolvedValue(user)
      vi.mocked(subscriptionsRepository.create).mockResolvedValue({} as Subscription)
      vi.mocked(categoriesRepository.bulkCreate).mockResolvedValue([] as Category[])

      await usersService.createFromWebhook(mockDb, TEST_CLERK_ID, 'test@example.com')

      expect(usersRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ displayName: null }),
      )
    })

    it('throws ConflictError if user already exists', async () => {
      vi.mocked(usersRepository.findByClerkId).mockResolvedValue(makeUser())

      await expect(
        usersService.createFromWebhook(mockDb, TEST_CLERK_ID, 'test@example.com'),
      ).rejects.toThrow(ConflictError)
    })
  })

  describe('updateFromWebhook', () => {
    it('updates user email and display name', async () => {
      const updated = makeUser({ email: 'new@example.com', displayName: 'New Name' })
      vi.mocked(usersRepository.updateByClerkId).mockResolvedValue(updated)

      const result = await usersService.updateFromWebhook(
        mockDb,
        TEST_CLERK_ID,
        'new@example.com',
        'New Name',
      )

      expect(result).toEqual(updated)
      expect(usersRepository.updateByClerkId).toHaveBeenCalledWith(mockDb, TEST_CLERK_ID, {
        email: 'new@example.com',
        displayName: 'New Name',
      })
    })

    it('sets displayName to null when not provided', async () => {
      vi.mocked(usersRepository.updateByClerkId).mockResolvedValue(makeUser())

      await usersService.updateFromWebhook(mockDb, TEST_CLERK_ID, 'test@example.com')

      expect(usersRepository.updateByClerkId).toHaveBeenCalledWith(mockDb, TEST_CLERK_ID, {
        email: 'test@example.com',
        displayName: null,
      })
    })
  })

  describe('deleteByClerkId', () => {
    it('deletes user and returns true', async () => {
      vi.mocked(usersRepository.deleteByClerkId).mockResolvedValue(true)

      const result = await usersService.deleteByClerkId(mockDb, TEST_CLERK_ID)

      expect(result).toBe(true)
    })

    it('returns false when user not found', async () => {
      vi.mocked(usersRepository.deleteByClerkId).mockResolvedValue(false)

      const result = await usersService.deleteByClerkId(mockDb, 'unknown')

      expect(result).toBe(false)
    })
  })

  describe('updatePreferences', () => {
    it('merges new preferences with existing ones', async () => {
      const user = makeUser()
      const updatedUser = makeUser({
        preferences: {
          ...DEFAULT_PREFERENCES,
          financialMonthStartDay: 1,
          defaultCurrency: 'USD',
        },
      })
      vi.mocked(usersRepository.findById).mockResolvedValue(user)
      vi.mocked(usersRepository.updatePreferences).mockResolvedValue(updatedUser)

      const result = await usersService.updatePreferences(mockDb, TEST_USER_ID, {
        financialMonthStartDay: 1,
        defaultCurrency: 'USD',
      })

      expect(result.preferences).toEqual(
        expect.objectContaining({
          financialMonthStartDay: 1,
          defaultCurrency: 'USD',
          theme: 'system',
        }),
      )
    })

    it('merges notification sub-fields', async () => {
      const user = makeUser()
      vi.mocked(usersRepository.findById).mockResolvedValue(user)
      vi.mocked(usersRepository.updatePreferences).mockResolvedValue(user)

      await usersService.updatePreferences(mockDb, TEST_USER_ID, {
        notifications: { inApp: false, push: false, desktop: true, email: true },
      })

      expect(usersRepository.updatePreferences).toHaveBeenCalledWith(
        mockDb,
        TEST_USER_ID,
        expect.objectContaining({
          notifications: { inApp: false, push: false, desktop: true, email: true },
        }),
      )
    })

    it('throws NotFoundError when user not found', async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(undefined)

      await expect(
        usersService.updatePreferences(mockDb, 'nonexistent', { theme: 'dark' }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError for invalid preference values', async () => {
      await expect(
        usersService.updatePreferences(mockDb, TEST_USER_ID, {
          financialMonthStartDay: 32,
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('completeOnboarding', () => {
    it('sets onboarding preferences and marks onboarding complete', async () => {
      const user = makeUser()
      const updatedUser = makeUser({ onboardingCompleted: true, isSalaried: true })
      vi.mocked(usersRepository.findById).mockResolvedValue(user)
      vi.mocked(usersRepository.updatePreferences).mockResolvedValue(user)
      vi.mocked(usersRepository.update).mockResolvedValue(updatedUser)

      const result = await usersService.completeOnboarding(mockDb, TEST_USER_ID, {
        financialMonthStartDay: 25,
        defaultCurrency: 'ZAR',
        isSalaried: true,
      })

      expect(result.onboardingCompleted).toBe(true)
      expect(result.isSalaried).toBe(true)
      expect(usersRepository.updatePreferences).toHaveBeenCalledWith(
        mockDb,
        TEST_USER_ID,
        expect.objectContaining({
          financialMonthStartDay: 25,
          defaultCurrency: 'ZAR',
        }),
      )
      expect(usersRepository.update).toHaveBeenCalledWith(mockDb, TEST_USER_ID, {
        isSalaried: true,
        onboardingCompleted: true,
      })
    })

    it('throws NotFoundError when user not found', async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(undefined)

      await expect(
        usersService.completeOnboarding(mockDb, 'nonexistent', {
          financialMonthStartDay: 25,
          defaultCurrency: 'ZAR',
          isSalaried: false,
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError for invalid onboarding data', async () => {
      await expect(
        usersService.completeOnboarding(mockDb, TEST_USER_ID, {
          financialMonthStartDay: 0,
          isSalaried: true,
        }),
      ).rejects.toThrow(ValidationError)
    })
  })
})
