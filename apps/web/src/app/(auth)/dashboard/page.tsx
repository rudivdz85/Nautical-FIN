import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import {
  accountsService,
  netWorthSnapshotsService,
  budgetsService,
  debtsService,
  savingsGoalsService,
  tasksService,
  transactionsService,
  aiInsightsService,
} from '@fin/core/services'
import { DashboardPageClient } from './dashboard-page-client'

export default async function DashboardPage() {
  const user = await getAuthenticatedUser()

  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [accounts, latestSnapshot, budgets, debts, savingsGoals, pendingTasks, recentTransactions, unreadInsights] =
    await Promise.all([
      accountsService.list(db, user.id),
      netWorthSnapshotsService.getLatest(db, user.id),
      budgetsService.list(db, user.id),
      debtsService.list(db, user.id),
      savingsGoalsService.list(db, user.id),
      tasksService.list(db, user.id, ['pending', 'snoozed']),
      transactionsService.list(db, user.id, {
        startDate: thirtyDaysAgo.toISOString().split('T')[0] ?? '',
      }),
      aiInsightsService.listUnread(db, user.id),
    ])

  const spendingBalance = accounts
    .filter((a) => a.classification === 'spending' && a.isActive)
    .reduce((sum, a) => sum + parseFloat(a.currentBalance), 0)

  const savingsBalance = accounts
    .filter((a) => a.accountType === 'savings' && a.isActive)
    .reduce((sum, a) => sum + parseFloat(a.currentBalance), 0)

  const totalDebt = debts.reduce((sum, d) => sum + parseFloat(d.currentBalance), 0)

  const totalAssets = accounts
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + parseFloat(a.currentBalance), 0)

  const netWorth = latestSnapshot
    ? parseFloat(latestSnapshot.netWorth)
    : totalAssets - totalDebt

  const activeBudget = budgets.find((b) => b.status === 'active')

  return (
    <DashboardPageClient
      netWorth={netWorth}
      availableToSpend={spendingBalance}
      totalSavings={latestSnapshot ? parseFloat(latestSnapshot.totalSavings ?? '0') : savingsBalance}
      totalDebt={totalDebt}
      activeBudget={activeBudget ?? null}
      recentTransactions={recentTransactions.slice(0, 5)}
      savingsGoals={savingsGoals}
      pendingTasks={pendingTasks}
      unreadInsights={unreadInsights}
    />
  )
}
