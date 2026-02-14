import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import {
  aiInsightsService,
  accountsService,
  transactionsService,
  budgetsService,
  debtsService,
  savingsGoalsService,
} from '@fin/core/services'
import type { Account, Transaction, Budget, Debt, SavingsGoal } from '@fin/core'
import { logger, WideEvent } from '@fin/logger'

export const maxDuration = 60

const insightsSchema = z.object({
  insights: z.array(
    z.object({
      insightType: z.enum([
        'monthly_checkin',
        'spending_alert',
        'savings_milestone',
        'budget_warning',
        'debt_progress',
        'recommendation',
      ]),
      title: z.string().max(200),
      content: z.string(),
      priority: z.number().int().min(1).max(10),
    }),
  ),
})

export async function POST() {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/ai-insights/generate',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [accounts, transactions, budgets, debts, savingsGoals] =
      await Promise.all([
        accountsService.list(db, user.id),
        transactionsService.list(db, user.id, {
          startDate: thirtyDaysAgo.toISOString().split('T')[0] ?? '',
        }),
        budgetsService.list(db, user.id),
        debtsService.list(db, user.id),
        savingsGoalsService.list(db, user.id),
      ])

    const activeBudget = budgets.find((b) => b.status === 'active')
    const prompt = buildAnalysisPrompt({
      accounts,
      transactions,
      activeBudget,
      debts,
      savingsGoals,
    })

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-5-20250929'),
      schema: insightsSchema,
      system: `You are a South African personal finance analyst. Analyze the user's financial data and generate 2-5 actionable insights. Use South African Rand (R) for currency. Be specific and reference actual numbers from the data. Each insight should be concise (1-3 sentences) and actionable.

Insight types:
- monthly_checkin: General monthly financial health summary
- spending_alert: Unusual or concerning spending patterns
- savings_milestone: Progress on savings goals
- budget_warning: Budget overruns or risks
- debt_progress: Debt payoff progress or concerns
- recommendation: Specific financial action to take

Priority scale: 1 (low) to 10 (critical). Use 7+ only for urgent items.`,
      prompt,
    })

    const created = []
    for (const insight of object.insights) {
      const result = await aiInsightsService.create(db, user.id, insight)
      created.push(result)
    }

    event.addMetadata({ action: 'generate_insights', count: created.length })
    event.finalize(200, 'success')
    logger.info(event.toJSON())

    return NextResponse.json({ data: created })
  } catch (error) {
    return handleApiError(error, event)
  }
}

interface FinancialContext {
  accounts: Account[]
  transactions: Transaction[]
  activeBudget: Budget | undefined
  debts: Debt[]
  savingsGoals: SavingsGoal[]
}

function buildAnalysisPrompt(ctx: FinancialContext): string {
  const totalAssets = ctx.accounts
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + parseFloat(a.currentBalance), 0)

  const totalDebt = ctx.debts.reduce(
    (sum, d) => sum + parseFloat(d.currentBalance),
    0,
  )

  const spendingByType: Record<string, number> = {}
  let totalSpending = 0
  for (const t of ctx.transactions) {
    if (t.transactionType === 'debit') {
      const amount = parseFloat(t.amount)
      totalSpending += amount
      const key = t.merchantNormalized ?? t.description ?? 'Other'
      spendingByType[key] = (spendingByType[key] ?? 0) + amount
    }
  }

  const topSpending = Object.entries(spendingByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, amount]) => `  - ${name}: R${amount.toFixed(2)}`)
    .join('\n')

  const accountsSummary = ctx.accounts
    .map(
      (a) =>
        `  - ${a.name} (${a.accountType}, ${a.classification}): R${parseFloat(a.currentBalance).toFixed(2)}`,
    )
    .join('\n')

  const debtsSummary = ctx.debts
    .map(
      (d) =>
        `  - ${d.name} (${d.debtType}): R${parseFloat(d.currentBalance).toFixed(2)} at ${d.interestRate ?? '0'}%`,
    )
    .join('\n')

  const savingsSummary = ctx.savingsGoals
    .map((s) => {
      const current = parseFloat(s.currentAmount ?? '0')
      const target = parseFloat(s.targetAmount ?? '0')
      const pct = target > 0 ? ((current / target) * 100).toFixed(1) : '0'
      return `  - ${s.name}: R${current.toFixed(2)} / R${target.toFixed(2)} (${pct}%)`
    })
    .join('\n')

  let budgetSection = 'No active budget.'
  if (ctx.activeBudget) {
    const b = ctx.activeBudget
    budgetSection = `Active budget: ${b.year}/${b.month}
  Planned income: R${b.totalPlannedIncome ?? '0'}
  Planned expenses: R${b.totalPlannedExpenses ?? '0'}
  Planned savings: R${b.totalPlannedSavings ?? '0'}
  Planned debt payments: R${b.totalPlannedDebtPayments ?? '0'}
  Unallocated: R${b.unallocatedAmount ?? '0'}`
  }

  return `FINANCIAL DATA (last 30 days):

ACCOUNTS:
${accountsSummary || '  None'}

NET WORTH: R${(totalAssets - totalDebt).toFixed(2)} (Assets: R${totalAssets.toFixed(2)}, Debt: R${totalDebt.toFixed(2)})

SPENDING (last 30 days): R${totalSpending.toFixed(2)}
Top spending:
${topSpending || '  No transactions'}

BUDGET:
${budgetSection}

DEBTS:
${debtsSummary || '  None'}

SAVINGS GOALS:
${savingsSummary || '  None'}

Transaction count: ${ctx.transactions.length} in last 30 days

Analyze this data and generate financial insights.`
}
