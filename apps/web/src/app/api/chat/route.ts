import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
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
- Format responses with markdown for readability`
}
