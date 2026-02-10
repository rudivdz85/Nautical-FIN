import { describe, it, expect, vi, beforeEach } from 'vitest'
import { accountsService } from '../../../packages/core/src/services/accounts.service.js'
import { accountsRepository } from '../../../packages/core/src/repositories/accounts.repository.js'
import { NotFoundError, ValidationError } from '../../../packages/core/src/errors/index.js'
import type { Account } from '../../../packages/core/src/types/accounts.js'

vi.mock('../../../packages/core/src/repositories/accounts.repository.js', () => ({
  accountsRepository: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    countByUserId: vi.fn(),
  },
}))

const mockDb = {} as Parameters<typeof accountsService.list>[0]
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    userId: TEST_USER_ID,
    name: 'Test Account',
    accountType: 'cheque',
    classification: 'spending',
    institution: null,
    accountNumberMasked: null,
    currency: 'ZAR',
    currentBalance: '0',
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

describe('accountsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns accounts for user', async () => {
      const accounts = [makeAccount(), makeAccount({ id: '33333333-3333-3333-3333-333333333333' })]
      vi.mocked(accountsRepository.findByUserId).mockResolvedValue(accounts)

      const result = await accountsService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual(accounts)
      expect(accountsRepository.findByUserId).toHaveBeenCalledWith(mockDb, TEST_USER_ID)
    })

    it('returns empty array when no accounts', async () => {
      vi.mocked(accountsRepository.findByUserId).mockResolvedValue([])

      const result = await accountsService.list(mockDb, TEST_USER_ID)

      expect(result).toEqual([])
    })
  })

  describe('getById', () => {
    it('returns the account when found', async () => {
      const account = makeAccount()
      vi.mocked(accountsRepository.findById).mockResolvedValue(account)

      const result = await accountsService.getById(mockDb, account.id, TEST_USER_ID)

      expect(result).toEqual(account)
    })

    it('throws NotFoundError when account does not exist', async () => {
      vi.mocked(accountsRepository.findById).mockResolvedValue(undefined)

      await expect(
        accountsService.getById(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('creates a cheque account with spending classification by default', async () => {
      const created = makeAccount({ isFirstAccount: true })
      vi.mocked(accountsRepository.countByUserId).mockResolvedValue(0)
      vi.mocked(accountsRepository.create).mockResolvedValue(created)

      const result = await accountsService.create(mockDb, TEST_USER_ID, {
        name: 'My Cheque',
        accountType: 'cheque',
        currency: 'ZAR',
        currentBalance: '1000.50',
      })

      expect(result).toEqual(created)
      expect(accountsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: TEST_USER_ID,
          name: 'My Cheque',
          accountType: 'cheque',
          classification: 'spending',
          isFirstAccount: true,
        }),
      )
    })

    it('creates a savings account with non_spending classification', async () => {
      const created = makeAccount({ accountType: 'savings', classification: 'non_spending' })
      vi.mocked(accountsRepository.countByUserId).mockResolvedValue(1)
      vi.mocked(accountsRepository.create).mockResolvedValue(created)

      await accountsService.create(mockDb, TEST_USER_ID, {
        name: 'Savings',
        accountType: 'savings',
        currency: 'ZAR',
      })

      expect(accountsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          classification: 'non_spending',
          isFirstAccount: false,
        }),
      )
    })

    it('forces non_spending for investment accounts even if spending requested', async () => {
      const created = makeAccount({ accountType: 'investment', classification: 'non_spending' })
      vi.mocked(accountsRepository.countByUserId).mockResolvedValue(1)
      vi.mocked(accountsRepository.create).mockResolvedValue(created)

      await accountsService.create(mockDb, TEST_USER_ID, {
        name: 'Investment',
        accountType: 'investment',
        classification: 'spending',
        currency: 'ZAR',
      })

      expect(accountsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          classification: 'non_spending',
        }),
      )
    })

    it('allows overriding savings to spending classification', async () => {
      const created = makeAccount({ accountType: 'savings', classification: 'spending' })
      vi.mocked(accountsRepository.countByUserId).mockResolvedValue(1)
      vi.mocked(accountsRepository.create).mockResolvedValue(created)

      await accountsService.create(mockDb, TEST_USER_ID, {
        name: 'Daily Savings',
        accountType: 'savings',
        classification: 'spending',
        currency: 'ZAR',
      })

      expect(accountsRepository.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          classification: 'spending',
        }),
      )
    })

    it('throws ValidationError for missing required fields', async () => {
      await expect(
        accountsService.create(mockDb, TEST_USER_ID, {
          name: '',
          accountType: 'cheque',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid balance format', async () => {
      await expect(
        accountsService.create(mockDb, TEST_USER_ID, {
          name: 'Test',
          accountType: 'cheque',
          currentBalance: 'not-a-number',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('update', () => {
    it('updates an existing account', async () => {
      const existing = makeAccount()
      const updated = makeAccount({ name: 'Updated Name' })
      vi.mocked(accountsRepository.findById).mockResolvedValue(existing)
      vi.mocked(accountsRepository.update).mockResolvedValue(updated)

      const result = await accountsService.update(mockDb, existing.id, TEST_USER_ID, {
        name: 'Updated Name',
      })

      expect(result.name).toBe('Updated Name')
    })

    it('throws NotFoundError when updating nonexistent account', async () => {
      vi.mocked(accountsRepository.findById).mockResolvedValue(undefined)

      await expect(
        accountsService.update(mockDb, 'nonexistent', TEST_USER_ID, { name: 'New' }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no fields provided', async () => {
      await expect(
        accountsService.update(mockDb, 'some-id', TEST_USER_ID, {}),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('delete', () => {
    it('soft deletes an account', async () => {
      vi.mocked(accountsRepository.softDelete).mockResolvedValue(true)

      await expect(
        accountsService.delete(mockDb, 'some-id', TEST_USER_ID),
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundError when deleting nonexistent account', async () => {
      vi.mocked(accountsRepository.softDelete).mockResolvedValue(false)

      await expect(
        accountsService.delete(mockDb, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError)
    })
  })
})
