import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { savingsGoalsRepository } from '../repositories/savings-goals.repository'
import { savingsContributionsRepository } from '../repositories/savings-contributions.repository'
import { accountsRepository } from '../repositories/accounts.repository'
import {
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
  createSavingsContributionSchema,
  updateSavingsContributionSchema,
} from '../validation/savings-goals'
import type {
  SavingsGoal,
  SavingsContribution,
  SavingsGoalWithContributions,
} from '../types/savings-goals'
import { NotFoundError, ValidationError } from '../errors/index'

type Database = NeonHttpDatabase

export const savingsGoalsService = {
  async list(db: Database, userId: string): Promise<SavingsGoal[]> {
    return savingsGoalsRepository.findByUserId(db, userId)
  },

  async listAll(db: Database, userId: string): Promise<SavingsGoal[]> {
    return savingsGoalsRepository.findAllByUserId(db, userId)
  },

  async getById(
    db: Database,
    id: string,
    userId: string,
  ): Promise<SavingsGoalWithContributions> {
    const goal = await savingsGoalsRepository.findById(db, id, userId)
    if (!goal) {
      throw new NotFoundError('SavingsGoal', id)
    }

    const contributions = await savingsContributionsRepository.findByGoalId(db, id)

    return { ...goal, contributions }
  },

  async create(db: Database, userId: string, input: unknown): Promise<SavingsGoal> {
    const parsed = createSavingsGoalSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid savings goal data', parsed.error.issues)
    }

    const data = parsed.data

    if (data.linkedAccountId) {
      const account = await accountsRepository.findById(db, data.linkedAccountId, userId)
      if (!account) {
        throw new NotFoundError('Account', data.linkedAccountId)
      }
    }

    return savingsGoalsRepository.create(db, {
      userId,
      linkedAccountId: data.linkedAccountId,
      name: data.name,
      goalType: data.goalType,
      targetAmount: data.targetAmount,
      targetDate: data.targetDate,
      targetMonthsOfExpenses: data.targetMonthsOfExpenses,
      monthlyContribution: data.monthlyContribution,
      priority: data.priority ?? 1,
      notes: data.notes,
    })
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    input: unknown,
  ): Promise<SavingsGoal> {
    const parsed = updateSavingsGoalSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid savings goal data', parsed.error.issues)
    }

    const existing = await savingsGoalsRepository.findById(db, id, userId)
    if (!existing) {
      throw new NotFoundError('SavingsGoal', id)
    }

    const data = parsed.data

    if (data.linkedAccountId) {
      const account = await accountsRepository.findById(db, data.linkedAccountId, userId)
      if (!account) {
        throw new NotFoundError('Account', data.linkedAccountId)
      }
    }

    const updated = await savingsGoalsRepository.update(db, id, userId, data)
    if (!updated) {
      throw new NotFoundError('SavingsGoal', id)
    }

    return updated
  },

  async delete(db: Database, id: string, userId: string): Promise<void> {
    const deleted = await savingsGoalsRepository.delete(db, id, userId)
    if (!deleted) {
      throw new NotFoundError('SavingsGoal', id)
    }
  },

  // Contributions

  async listContributions(
    db: Database,
    goalId: string,
    userId: string,
  ): Promise<SavingsContribution[]> {
    const goal = await savingsGoalsRepository.findById(db, goalId, userId)
    if (!goal) {
      throw new NotFoundError('SavingsGoal', goalId)
    }

    return savingsContributionsRepository.findByGoalId(db, goalId)
  },

  async addContribution(
    db: Database,
    goalId: string,
    userId: string,
    input: unknown,
  ): Promise<SavingsContribution> {
    const parsed = createSavingsContributionSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid contribution data', parsed.error.issues)
    }

    const goal = await savingsGoalsRepository.findById(db, goalId, userId)
    if (!goal) {
      throw new NotFoundError('SavingsGoal', goalId)
    }

    const data = parsed.data

    const contribution = await savingsContributionsRepository.create(db, {
      savingsGoalId: goalId,
      amount: data.amount,
      contributionDate: data.contributionDate,
      transactionId: data.transactionId,
      source: data.source,
    })

    const newAmount = add(parseFloat(goal.currentAmount ?? '0'), parseFloat(data.amount))

    const updateData: Parameters<typeof savingsGoalsRepository.update>[3] = {
      currentAmount: newAmount.toFixed(2),
    }

    // Auto-complete if target reached
    if (goal.targetAmount && newAmount >= parseFloat(goal.targetAmount)) {
      updateData.isCompleted = true
      updateData.completedAt = new Date()
    }

    await savingsGoalsRepository.update(db, goalId, userId, updateData)

    return contribution
  },

  async updateContribution(
    db: Database,
    goalId: string,
    contributionId: string,
    userId: string,
    input: unknown,
  ): Promise<SavingsContribution> {
    const parsed = updateSavingsContributionSchema.safeParse(input)
    if (!parsed.success) {
      throw buildValidationError('Invalid contribution data', parsed.error.issues)
    }

    const goal = await savingsGoalsRepository.findById(db, goalId, userId)
    if (!goal) {
      throw new NotFoundError('SavingsGoal', goalId)
    }

    const existing = await savingsContributionsRepository.findById(db, contributionId, goalId)
    if (!existing) {
      throw new NotFoundError('SavingsContribution', contributionId)
    }

    const data = parsed.data

    // If amount changed, adjust goal currentAmount
    if (data.amount && data.amount !== existing.amount) {
      const oldAmount = parseFloat(existing.amount)
      const newAmount = parseFloat(data.amount)
      const currentAmount = parseFloat(goal.currentAmount ?? '0')
      const adjustedAmount = currentAmount - oldAmount + newAmount

      await savingsGoalsRepository.update(db, goalId, userId, {
        currentAmount: adjustedAmount.toFixed(2),
      })
    }

    const updated = await savingsContributionsRepository.update(db, contributionId, goalId, data)
    if (!updated) {
      throw new NotFoundError('SavingsContribution', contributionId)
    }

    return updated
  },

  async removeContribution(
    db: Database,
    goalId: string,
    contributionId: string,
    userId: string,
  ): Promise<void> {
    const goal = await savingsGoalsRepository.findById(db, goalId, userId)
    if (!goal) {
      throw new NotFoundError('SavingsGoal', goalId)
    }

    const contribution = await savingsContributionsRepository.findById(
      db,
      contributionId,
      goalId,
    )
    if (!contribution) {
      throw new NotFoundError('SavingsContribution', contributionId)
    }

    const restoredAmount = subtract(
      parseFloat(goal.currentAmount ?? '0'),
      parseFloat(contribution.amount),
    )

    await savingsContributionsRepository.delete(db, contributionId, goalId)

    await savingsGoalsRepository.update(db, goalId, userId, {
      currentAmount: restoredAmount.toFixed(2),
    })
  },
}

function add(a: number, b: number): number {
  return Math.round((a + b) * 100) / 100
}

function subtract(a: number, b: number): number {
  return Math.round((a - b) * 100) / 100
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
