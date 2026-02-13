import { describe, it, expect, vi, beforeEach } from 'vitest'
import { savingsGoalsService } from '../../../packages/core/src/services/savings-goals.service'
import { savingsGoalsRepository } from '../../../packages/core/src/repositories/savings-goals.repository'
import { savingsContributionsRepository } from '../../../packages/core/src/repositories/savings-contributions.repository'
import { accountsRepository } from '../../../packages/core/src/repositories/accounts.repository'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index'
import type { SavingsGoal, SavingsContribution } from '../../../packages/core/src/types/savings-goals'
import type { Account } from '../../../packages/core/src/types/accounts'

vi.mock('../../../packages/core/src/repositories/savings-goals.repository', () => ({
  savingsGoalsRepository: {
    findByUserId: vi.fn(),
    findAllByUserId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/savings-contributions.repository', () => ({
  savingsContributionsRepository: {
    findByGoalId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../packages/core/src/repositories/accounts.repository', () => ({
  accountsRepository: {
    findById: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof savingsGoalsService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const TEST_ACCOUNT_ID = '22222222-2222-2222-2222-222222222222'
const TEST_GOAL_ID = '33333333-3333-3333-3333-333333333333'
const TEST_CONTRIBUTION_ID = '44444444-4444-4444-4444-444444444444'

function makeGoal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: TEST_GOAL_ID,
    userId: TEST_USER_ID,
    linkedAccountId: null,
    name: 'Emergency Fund',
    goalType: 'emergency',
    targetAmount: '50000.00',
    currentAmount: '10000.00',
    targetDate: '2026-12-31',
    targetMonthsOfExpenses: 3,
    monthlyContribution: '2000.00',
    priority: 1,
    isActive: true,
    isCompleted: false,
    completedAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeContribution(overrides: Partial<SavingsContribution> = {}): SavingsContribution {
  return {
    id: TEST_CONTRIBUTION_ID,
    savingsGoalId: TEST_GOAL_ID,
    transactionId: null,
    amount: '2000.00',
    contributionDate: '2025-02-01',
    source: null,
    createdAt: new Date(),
    ...overrides,
  }
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: TEST_ACCOUNT_ID,
    userId: TEST_USER_ID,
    name: 'Savings Account',
    accountType: 'savings',
    classification: 'non_spending',
    institution: null,
    accountNumberMasked: null,
    currency: 'ZAR',
    currentBalance: '50000.00',
    balanceAsOfDate: null,
    creditLimit: null,
    isActive: true,
    isFirstAccount: false,
    syncMethod: 'manual',
    bankSyncEnabled: false,
    bankSyncLastAt: null,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('savingsGoalsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns active savings goals for user', async () => {
      const goals = [makeGoal()]
      vi.mocked(savingsGoalsRepository.findByUserId).mockResolvedValue(goals)

      const result = await savingsGoalsService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual(goals)
    })
  })

  describe('listAll', () => {
    it('returns all goals including inactive', async () => {
      const goals = [makeGoal(), makeGoal({ isActive: false })]
      vi.mocked(savingsGoalsRepository.findAllByUserId).mockResolvedValue(goals)

      const result = await savingsGoalsService.listAll(mockDb, TEST_USER_ID)

      expect(result).toHaveLength(2)
    })
  })

  describe('getById', () => {
    it('returns goal with contributions', async () => {
      const goal = makeGoal()
      const contributions = [makeContribution()]
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(goal)
      vi.mocked(savingsContributionsRepository.findByGoalId).mockResolvedValue(contributions)

      const result = await savingsGoalsService.getById(mockDb, TEST_GOAL_ID, TEST_USER_ID)

      expect(result.id).toBe(TEST_GOAL_ID)
      expect(result.contributions).toEqual(contributions)
    })

    it('throws NotFoundError when not found', async () => {
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(undefined)

      await expect(
        savingsGoalsService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates a savings goal', async () => {
      const goal = makeGoal()
      vi.mocked(savingsGoalsRepository.create).mockResolvedValue(goal)

      const result = await savingsGoalsService.create(mockDb, TEST_USER_ID, {
        name: 'Emergency Fund',
        goalType: 'emergency',
        targetAmount: '50000.00',
      })

      expect(result).toEqual(goal)
      expect(savingsGoalsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          name: 'Emergency Fund',
          goalType: 'emergency',
          targetAmount: '50000.00',
          priority: 1,
        }),
      )
    })

    it('validates linked account exists', async () => {
      vi.mocked(accountsRepository.findById).mockResolvedValue(makeAccount())
      vi.mocked(savingsGoalsRepository.create).mockResolvedValue(makeGoal({ linkedAccountId: TEST_ACCOUNT_ID }))

      await savingsGoalsService.create(mockDb, TEST_USER_ID, {
        name: 'Emergency Fund',
        goalType: 'emergency',
        linkedAccountId: TEST_ACCOUNT_ID,
      })

      expect(accountsRepository.findById).toHaveBeenCalledWith(mockDb, TEST_ACCOUNT_ID, TEST_USER_ID)
    })

    it('throws NotFoundError when linked account does not exist', async () => {
      vi.mocked(accountsRepository.findById).mockResolvedValue(undefined)

      await expect(
        savingsGoalsService.create(mockDb, TEST_USER_ID, {
          name: 'Emergency Fund',
          goalType: 'emergency',
          linkedAccountId: TEST_ACCOUNT_ID,
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError for empty name', async () => {
      await expect(
        savingsGoalsService.create(mockDb, TEST_USER_ID, {
          name: '',
          goalType: 'emergency',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid goal type', async () => {
      await expect(
        savingsGoalsService.create(mockDb, TEST_USER_ID, {
          name: 'My Goal',
          goalType: 'invalid_type',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('update', () => {
    it('updates goal fields', async () => {
      const existing = makeGoal()
      const updated = makeGoal({ targetAmount: '75000.00' })
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(existing)
      vi.mocked(savingsGoalsRepository.update).mockResolvedValue(updated)

      const result = await savingsGoalsService.update(mockDb, TEST_GOAL_ID, TEST_USER_ID, {
        targetAmount: '75000.00',
      })

      expect(result.targetAmount).toBe('75000.00')
    })

    it('validates linked account on update', async () => {
      const existing = makeGoal()
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(existing)
      vi.mocked(accountsRepository.findById).mockResolvedValue(undefined)

      await expect(
        savingsGoalsService.update(mockDb, TEST_GOAL_ID, TEST_USER_ID, {
          linkedAccountId: TEST_ACCOUNT_ID,
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when goal does not exist', async () => {
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(undefined)

      await expect(
        savingsGoalsService.update(mockDb, 'nonexistent', TEST_USER_ID, { name: 'Updated' }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        savingsGoalsService.update(mockDb, TEST_GOAL_ID, TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })

    it('can deactivate a goal', async () => {
      const existing = makeGoal()
      const updated = makeGoal({ isActive: false })
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(existing)
      vi.mocked(savingsGoalsRepository.update).mockResolvedValue(updated)

      const result = await savingsGoalsService.update(mockDb, TEST_GOAL_ID, TEST_USER_ID, {
        isActive: false,
      })

      expect(result.isActive).toBe(false)
    })
  })

  describe('delete', () => {
    it('deletes a goal', async () => {
      vi.mocked(savingsGoalsRepository.delete).mockResolvedValue(true)

      await expect(
        savingsGoalsService.delete(mockDb, TEST_GOAL_ID, TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when goal does not exist', async () => {
      vi.mocked(savingsGoalsRepository.delete).mockResolvedValue(false)

      await expect(
        savingsGoalsService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('listContributions', () => {
    it('returns contributions for a goal', async () => {
      const goal = makeGoal()
      const contributions = [makeContribution(), makeContribution({ id: 'contrib-2' })]
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(goal)
      vi.mocked(savingsContributionsRepository.findByGoalId).mockResolvedValue(contributions)

      const result = await savingsGoalsService.listContributions(mockDb, TEST_GOAL_ID, TEST_USER_ID)

      expect(result).toHaveLength(2)
    })

    it('throws NotFoundError when goal does not exist', async () => {
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(undefined)

      await expect(
        savingsGoalsService.listContributions(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('addContribution', () => {
    it('creates contribution and increases goal currentAmount', async () => {
      const goal = makeGoal({ currentAmount: '10000.00' })
      const contribution = makeContribution()
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(goal)
      vi.mocked(savingsContributionsRepository.create).mockResolvedValue(contribution)
      vi.mocked(savingsGoalsRepository.update).mockResolvedValue(makeGoal({ currentAmount: '12000.00' }))

      const result = await savingsGoalsService.addContribution(mockDb, TEST_GOAL_ID, TEST_USER_ID, {
        amount: '2000.00',
        contributionDate: '2025-02-01',
      })

      expect(result).toEqual(contribution)
      expect(savingsGoalsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_GOAL_ID, TEST_USER_ID,
        expect.objectContaining({ currentAmount: '12000.00' }),
      )
    })

    it('auto-completes goal when target is reached', async () => {
      const goal = makeGoal({ currentAmount: '48000.00', targetAmount: '50000.00' })
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(goal)
      vi.mocked(savingsContributionsRepository.create).mockResolvedValue(makeContribution())
      vi.mocked(savingsGoalsRepository.update).mockResolvedValue(
        makeGoal({ isCompleted: true, currentAmount: '50000.00' }),
      )

      await savingsGoalsService.addContribution(mockDb, TEST_GOAL_ID, TEST_USER_ID, {
        amount: '2000.00',
        contributionDate: '2025-02-01',
      })

      expect(savingsGoalsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_GOAL_ID, TEST_USER_ID,
        expect.objectContaining({
          currentAmount: '50000.00',
          isCompleted: true,
          completedAt: expect.any(Date),
        }),
      )
    })

    it('does not auto-complete when no targetAmount set', async () => {
      const goal = makeGoal({ currentAmount: '10000.00', targetAmount: null })
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(goal)
      vi.mocked(savingsContributionsRepository.create).mockResolvedValue(makeContribution())
      vi.mocked(savingsGoalsRepository.update).mockResolvedValue(makeGoal({ currentAmount: '12000.00' }))

      await savingsGoalsService.addContribution(mockDb, TEST_GOAL_ID, TEST_USER_ID, {
        amount: '2000.00',
        contributionDate: '2025-02-01',
      })

      expect(savingsGoalsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_GOAL_ID, TEST_USER_ID,
        { currentAmount: '12000.00' },
      )
    })

    it('throws NotFoundError when goal does not exist', async () => {
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(undefined)

      await expect(
        savingsGoalsService.addContribution(mockDb, 'nonexistent', TEST_USER_ID, {
          amount: '2000.00',
          contributionDate: '2025-02-01',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError for invalid contribution data', async () => {
      await expect(
        savingsGoalsService.addContribution(mockDb, TEST_GOAL_ID, TEST_USER_ID, {
          amount: 'abc',
          contributionDate: '2025-02-01',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('updateContribution', () => {
    it('updates contribution and adjusts goal amount when amount changes', async () => {
      const goal = makeGoal({ currentAmount: '12000.00' })
      const existing = makeContribution({ amount: '2000.00' })
      const updated = makeContribution({ amount: '3000.00' })
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(goal)
      vi.mocked(savingsContributionsRepository.findById).mockResolvedValue(existing)
      vi.mocked(savingsContributionsRepository.update).mockResolvedValue(updated)
      vi.mocked(savingsGoalsRepository.update).mockResolvedValue(makeGoal({ currentAmount: '13000.00' }))

      const result = await savingsGoalsService.updateContribution(
        mockDb, TEST_GOAL_ID, TEST_CONTRIBUTION_ID, TEST_USER_ID,
        { amount: '3000.00' },
      )

      expect(result.amount).toBe('3000.00')
      // Old balance (12000) - old contrib (2000) + new contrib (3000) = 13000
      expect(savingsGoalsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_GOAL_ID, TEST_USER_ID,
        { currentAmount: '13000.00' },
      )
    })

    it('does not adjust amount when only date changes', async () => {
      const goal = makeGoal()
      const existing = makeContribution()
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(goal)
      vi.mocked(savingsContributionsRepository.findById).mockResolvedValue(existing)
      vi.mocked(savingsContributionsRepository.update).mockResolvedValue(
        makeContribution({ contributionDate: '2025-03-01' }),
      )

      await savingsGoalsService.updateContribution(
        mockDb, TEST_GOAL_ID, TEST_CONTRIBUTION_ID, TEST_USER_ID,
        { contributionDate: '2025-03-01' },
      )

      expect(savingsGoalsRepository.update).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when goal does not exist', async () => {
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(undefined)

      await expect(
        savingsGoalsService.updateContribution(
          mockDb, 'nonexistent', TEST_CONTRIBUTION_ID, TEST_USER_ID,
          { amount: '3000.00' },
        ),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when contribution does not exist', async () => {
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(makeGoal())
      vi.mocked(savingsContributionsRepository.findById).mockResolvedValue(undefined)

      await expect(
        savingsGoalsService.updateContribution(
          mockDb, TEST_GOAL_ID, 'nonexistent', TEST_USER_ID,
          { amount: '3000.00' },
        ),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        savingsGoalsService.updateContribution(
          mockDb, TEST_GOAL_ID, TEST_CONTRIBUTION_ID, TEST_USER_ID, {},
        ),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('removeContribution', () => {
    it('removes contribution and reduces goal amount', async () => {
      const goal = makeGoal({ currentAmount: '12000.00' })
      const contribution = makeContribution({ amount: '2000.00' })
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(goal)
      vi.mocked(savingsContributionsRepository.findById).mockResolvedValue(contribution)
      vi.mocked(savingsContributionsRepository.delete).mockResolvedValue(true)
      vi.mocked(savingsGoalsRepository.update).mockResolvedValue(makeGoal({ currentAmount: '10000.00' }))

      await savingsGoalsService.removeContribution(
        mockDb, TEST_GOAL_ID, TEST_CONTRIBUTION_ID, TEST_USER_ID,
      )

      expect(savingsContributionsRepository.delete).toHaveBeenCalledWith(
        mockDb, TEST_CONTRIBUTION_ID, TEST_GOAL_ID,
      )
      // Amount should be restored: 12000 - 2000 = 10000
      expect(savingsGoalsRepository.update).toHaveBeenCalledWith(
        mockDb, TEST_GOAL_ID, TEST_USER_ID,
        { currentAmount: '10000.00' },
      )
    })

    it('throws NotFoundError when goal does not exist', async () => {
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(undefined)

      await expect(
        savingsGoalsService.removeContribution(
          mockDb, 'nonexistent', TEST_CONTRIBUTION_ID, TEST_USER_ID,
        ),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when contribution does not exist', async () => {
      vi.mocked(savingsGoalsRepository.findById).mockResolvedValue(makeGoal())
      vi.mocked(savingsContributionsRepository.findById).mockResolvedValue(undefined)

      await expect(
        savingsGoalsService.removeContribution(
          mockDb, TEST_GOAL_ID, 'nonexistent', TEST_USER_ID,
        ),
      ).rejects.toThrow(NotFoundError)
    })
  })
})
