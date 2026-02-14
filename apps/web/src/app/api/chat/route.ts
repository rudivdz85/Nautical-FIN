import { streamText, convertToModelMessages, tool, stepCountIs, type UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import {
  chatMessagesService,
  accountsService,
  transactionsService,
  budgetsService,
  debtsService,
  savingsGoalsService,
  tasksService,
  categoriesService,
} from '@fin/core/services'
import { logger, WideEvent } from '@fin/logger'

export const maxDuration = 60

function extractTextFromParts(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export async function POST(request: Request) {
  const event = new WideEvent('api').setRequest({
    method: 'POST',
    path: '/api/chat',
  })

  try {
    const user = await getAuthenticatedUser()
    event.setUser({ id: user.id, clerkId: user.clerkId })

    const { messages } = (await request.json()) as { messages: UIMessage[] }
    const lastUserMessage = messages.filter((m) => m.role === 'user').at(-1)

    event.addMetadata({
      action: 'chat_stream',
      messageCount: messages.length,
    })

    // Fetch financial context in parallel
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [accounts, recentTransactions, budgets, debts, savingsGoals] =
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

    const systemPrompt = buildSystemPrompt({
      accounts,
      recentTransactions,
      activeBudget,
      debts,
      savingsGoals,
    })

    // Persist user message
    if (lastUserMessage) {
      const userText = extractTextFromParts(lastUserMessage)
      if (userText) {
        await chatMessagesService.create(db, user.id, {
          role: 'user',
          content: userText,
        })
      }
    }

    const modelMessages = await convertToModelMessages(messages)

    const result = streamText({
      model: anthropic('claude-sonnet-4-5-20250929'),
      system: systemPrompt,
      messages: modelMessages,
      tools: {
        getAccountBalances: tool({
          description:
            'Get all user accounts with current balances, types, and classifications',
          inputSchema: z.object({}),
          execute: async () => {
            const accts = await accountsService.list(db, user.id)
            return accts.map((a) => ({
              name: a.name,
              type: a.accountType,
              classification: a.classification,
              balance: a.currentBalance,
              currency: a.currency,
            }))
          },
        }),
        getRecentTransactions: tool({
          description:
            'Get recent transactions, optionally filtered by number of days',
          inputSchema: z.object({
            days: z
              .number()
              .int()
              .min(1)
              .max(365)
              .default(30)
              .describe('Number of past days to include'),
          }),
          execute: async ({ days }) => {
            const start = new Date()
            start.setDate(start.getDate() - days)
            const txns = await transactionsService.list(db, user.id, {
              startDate: start.toISOString().split('T')[0] ?? '',
            })
            return txns.slice(0, 50).map((t) => ({
              date: t.transactionDate,
              description: t.description,
              amount: t.amount,
              type: t.transactionType,
              categoryId: t.categoryId,
              merchant: t.merchantNormalized ?? t.merchantOriginal,
            }))
          },
        }),
        getBudgetSummary: tool({
          description:
            'Get the active monthly budget summary including income, expenses, and unallocated amounts',
          inputSchema: z.object({}),
          execute: async () => {
            const budgetList = await budgetsService.list(db, user.id)
            const active = budgetList.find((b) => b.status === 'active')
            if (!active) return { hasBudget: false }
            return {
              hasBudget: true,
              year: active.year,
              month: active.month,
              status: active.status,
              totalPlannedIncome: active.totalPlannedIncome,
              totalPlannedExpenses: active.totalPlannedExpenses,
              totalPlannedSavings: active.totalPlannedSavings,
              totalPlannedDebtPayments: active.totalPlannedDebtPayments,
              unallocatedAmount: active.unallocatedAmount,
            }
          },
        }),
        getSpendingByCategory: tool({
          description:
            'Get spending breakdown grouped by category for a date range',
          inputSchema: z.object({
            days: z
              .number()
              .int()
              .min(1)
              .max(365)
              .default(30)
              .describe('Number of past days to analyze'),
          }),
          execute: async ({ days }) => {
            const start = new Date()
            start.setDate(start.getDate() - days)
            const [txns, cats] = await Promise.all([
              transactionsService.list(db, user.id, {
                startDate: start.toISOString().split('T')[0] ?? '',
                transactionType: 'debit',
              }),
              categoriesService.list(db, user.id),
            ])
            const catMap = new Map(cats.map((c) => [c.id, c.name]))
            const spending: Record<string, number> = {}
            for (const t of txns) {
              const name = t.categoryId
                ? (catMap.get(t.categoryId) ?? 'Unknown')
                : 'Uncategorized'
              spending[name] = (spending[name] ?? 0) + parseFloat(t.amount)
            }
            return Object.entries(spending)
              .map(([category, total]) => ({
                category,
                total: total.toFixed(2),
              }))
              .sort((a, b) => parseFloat(b.total) - parseFloat(a.total))
          },
        }),
        createTask: tool({
          description: 'Create a new task or reminder for the user',
          inputSchema: z.object({
            title: z.string().describe('Task title'),
            description: z
              .string()
              .optional()
              .describe('Task description'),
            priority: z
              .enum(['low', 'medium', 'high'])
              .default('medium')
              .describe('Task priority'),
            dueDate: z
              .string()
              .optional()
              .describe('Due date in YYYY-MM-DD format'),
          }),
          execute: async ({ title, description, priority, dueDate }) => {
            const task = await tasksService.create(db, user.id, {
              title,
              description: description ?? null,
              priority,
              taskType: 'custom',
              dueDate: dueDate ?? null,
            })
            return { created: true, taskId: task.id, title: task.title }
          },
        }),
        markTaskComplete: tool({
          description: 'Mark an existing task as complete by its ID',
          inputSchema: z.object({
            taskId: z
              .string()
              .uuid()
              .describe('The ID of the task to complete'),
          }),
          execute: async ({ taskId }) => {
            const task = await tasksService.complete(db, taskId, user.id)
            return { completed: true, title: task.title }
          },
        }),
      },
      stopWhen: stepCountIs(5),
      onFinish: async ({ text }) => {
        if (text) {
          await chatMessagesService.create(db, user.id, {
            role: 'assistant',
            content: text,
          })
        }

        event.finalize(200, 'success')
        logger.info(event.toJSON())
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    return handleApiError(error, event)
  }
}

import type { Account, Transaction, Budget, Debt, SavingsGoal } from '@fin/core'

interface FinancialContext {
  accounts: Account[]
  recentTransactions: Transaction[]
  activeBudget: Budget | undefined
  debts: Debt[]
  savingsGoals: SavingsGoal[]
}

function buildSystemPrompt(ctx: FinancialContext): string {
  const accountsSummary = ctx.accounts
    .map((a) => `- ${a.name} (${a.accountType}): R${a.currentBalance ?? '0'}`)
    .join('\n')

  const transactionsSummary = ctx.recentTransactions
    .slice(0, 20)
    .map(
      (t) =>
        `- ${t.transactionDate}: ${t.description} — R${t.amount} (${t.transactionType})`,
    )
    .join('\n')

  const debtsSummary = ctx.debts
    .map((d) => `- ${d.name} (${d.debtType}): R${d.currentBalance ?? '0'} at ${d.interestRate ?? '0'}%`)
    .join('\n')

  const savingsSummary = ctx.savingsGoals
    .map((s) => `- ${s.name} (${s.goalType}): R${s.currentAmount ?? '0'} / R${s.targetAmount ?? '0'}`)
    .join('\n')

  return `You are Fin, a friendly and knowledgeable personal finance assistant for a South African user. You help with budgeting, tracking expenses, managing debt, and reaching savings goals.

CONTEXT — The user's current financial data:

ACCOUNTS:
${accountsSummary || 'No accounts yet.'}

RECENT TRANSACTIONS (last 30 days):
${transactionsSummary || 'No recent transactions.'}

${ctx.activeBudget ? `ACTIVE BUDGET: ${ctx.activeBudget.year}/${ctx.activeBudget.month} (${ctx.activeBudget.status})` : 'No active budget.'}

DEBTS:
${debtsSummary || 'No debts.'}

SAVINGS GOALS:
${savingsSummary || 'No savings goals.'}

GUIDELINES:
- Use South African Rand (R) for currency
- Be concise and actionable
- When discussing amounts, reference their actual data
- If asked about something outside finances, politely redirect to financial topics
- Never fabricate data — only reference what is provided in the context above
- You have tools to query fresh data and take actions — use them when the user asks for specific analysis or wants to create/complete tasks
- Format responses with markdown for readability`
}
