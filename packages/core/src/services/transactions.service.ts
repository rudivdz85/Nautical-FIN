import { randomUUID } from 'crypto'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { transactionsRepository } from '../repositories/transactions.repository'
import { accountsRepository } from '../repositories/accounts.repository'
import {
  createTransactionSchema,
  createTransferSchema,
  updateTransactionSchema,
} from '../validation/transactions'
import type { Transaction, TransactionFilters } from '../types/transactions'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const transactionsService = {
  async list(
    db: Database,
    userId: string,
    filters: TransactionFilters = {},
  ): Promise<Transaction[]> {
    return transactionsRepository.findByUserId(db, userId, filters)
  },

  async getById(db: Database, id: string, userId: string): Promise<Transaction> {
    const transaction = await transactionsRepository.findById(db, id, userId)
    if (!transaction) {
      throw new NotFoundError('Transaction', id)
    }
    return transaction
  },

  async create(db: Database, userId: string, input: unknown): Promise<Transaction> {
    const parsed = createTransactionSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid transaction data', parsed.error.issues)
    }

    const data = parsed.data

    if (data.transactionType === 'transfer') {
      throw new ValidationError('Use createTransfer for transfer transactions')
    }

    const account = await accountsRepository.findById(db, data.accountId, userId)
    if (!account) {
      throw new NotFoundError('Account', data.accountId)
    }

    const transaction = await transactionsRepository.create(db, {
      userId,
      accountId: data.accountId,
      categoryId: data.categoryId,
      amount: data.amount,
      currency: data.currency,
      transactionDate: data.transactionDate,
      postedDate: data.postedDate,
      description: data.description,
      merchantOriginal: data.merchantOriginal,
      merchantNormalized: data.merchantNormalized,
      notes: data.notes,
      transactionType: data.transactionType,
      source: 'manual',
      isReviewed: data.isReviewed ?? true,
    })

    const balanceDelta = computeBalanceDelta(data.transactionType, data.amount)
    await accountsRepository.adjustBalance(db, data.accountId, userId, balanceDelta)

    return transaction
  },

  async createTransfer(
    db: Database,
    userId: string,
    input: unknown,
  ): Promise<{ debit: Transaction; credit: Transaction }> {
    const parsed = createTransferSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid transfer data', parsed.error.issues)
    }

    const data = parsed.data

    const fromAccount = await accountsRepository.findById(db, data.fromAccountId, userId)
    if (!fromAccount) {
      throw new NotFoundError('Source account', data.fromAccountId)
    }

    const toAccount = await accountsRepository.findById(db, data.toAccountId, userId)
    if (!toAccount) {
      throw new NotFoundError('Destination account', data.toAccountId)
    }

    const pairId = randomUUID()

    const debit = await transactionsRepository.create(db, {
      userId,
      accountId: data.fromAccountId,
      amount: data.amount,
      currency: data.currency,
      transactionDate: data.transactionDate,
      description: data.description,
      notes: data.notes,
      transactionType: 'debit',
      source: 'manual',
      transferPairId: pairId,
      transferToAccountId: data.toAccountId,
      isReviewed: true,
    })

    const credit = await transactionsRepository.create(db, {
      userId,
      accountId: data.toAccountId,
      amount: data.amount,
      currency: data.currency,
      transactionDate: data.transactionDate,
      description: data.description,
      notes: data.notes,
      transactionType: 'credit',
      source: 'manual',
      transferPairId: pairId,
      transferToAccountId: data.fromAccountId,
      isReviewed: true,
    })

    await accountsRepository.adjustBalance(
      db, data.fromAccountId, userId, `-${data.amount}`,
    )
    await accountsRepository.adjustBalance(
      db, data.toAccountId, userId, data.amount,
    )

    return { debit, credit }
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    input: unknown,
  ): Promise<Transaction> {
    const parsed = updateTransactionSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid transaction data', parsed.error.issues)
    }

    const existing = await transactionsRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('Transaction', id)
    }

    if (parsed.data.amount && parsed.data.amount !== existing.amount) {
      const oldDelta = computeBalanceDelta(existing.transactionType, existing.amount)
      const newDelta = computeBalanceDelta(existing.transactionType, parsed.data.amount)
      const reverseDelta = negateAmount(oldDelta)
      await accountsRepository.adjustBalance(db, existing.accountId, userId, reverseDelta)
      await accountsRepository.adjustBalance(db, existing.accountId, userId, newDelta)
    }

    const updated = await transactionsRepository.update(db, id, userId, parsed.data)
    if (!updated) {
      throw new NotFoundError('Transaction', id)
    }

    return updated
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const existing = await transactionsRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('Transaction', id)
    }

    if (existing.transferPairId) {
      const pairTransactions = await transactionsRepository.findByTransferPairId(
        db, existing.transferPairId,
      )
      for (const tx of pairTransactions) {
        const reverseDelta = negateAmount(
          computeBalanceDelta(tx.transactionType, tx.amount),
        )
        await accountsRepository.adjustBalance(db, tx.accountId, userId, reverseDelta)
      }
      await transactionsRepository.deleteByTransferPairId(db, existing.transferPairId)
      return
    }

    const reverseDelta = negateAmount(
      computeBalanceDelta(existing.transactionType, existing.amount),
    )
    await accountsRepository.adjustBalance(db, existing.accountId, userId, reverseDelta)

    const deleted = await transactionsRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('Transaction', id)
    }
  },
}

function computeBalanceDelta(
  transactionType: 'debit' | 'credit' | 'transfer',
  amount: string,
): string {
  switch (transactionType) {
    case 'debit':
      return `-${amount}`
    case 'credit':
      return amount
    case 'transfer':
      return '0'
  }
}

function negateAmount(amount: string): string {
  if (amount.startsWith('-')) {
    return amount.slice(1)
  }
  return `-${amount}`
}

function buildValidationError(
  message: string,
  issues: { path: (string | number)[]; message: string }[],
): ValidationError {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of issues) {
    const path = issue.path.join('.')
    if (!fieldErrors[path]) {
      fieldErrors[path] = []
    }
    fieldErrors[path].push(issue.message)
  }
  return new ValidationError(message, fieldErrors)
}
