'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Budget, Transaction, SavingsGoal, Task } from '@fin/core'
import {
  Wallet,
  TrendingUp,
  PiggyBank,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { apiClient, ApiError } from '@/lib/api-client'
import {
  formatCurrency,
  formatDate,
  formatTransactionType,
  formatMonth,
  formatBudgetStatus,
} from '@/lib/format'

interface DashboardPageClientProps {
  netWorth: number
  availableToSpend: number
  totalSavings: number
  totalDebt: number
  activeBudget: Budget | null
  recentTransactions: Transaction[]
  savingsGoals: SavingsGoal[]
  pendingTasks: Task[]
}

export function DashboardPageClient({
  netWorth,
  availableToSpend,
  totalSavings,
  totalDebt,
  activeBudget,
  recentTransactions,
  savingsGoals,
  pendingTasks,
}: DashboardPageClientProps) {
  const router = useRouter()

  async function handleTaskAction(taskId: string, action: 'complete' | 'dismiss') {
    try {
      await apiClient.post(`/api/tasks/${taskId}/${action}`, {})
      toast.success(action === 'complete' ? 'Task completed' : 'Task dismissed')
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error(`Failed to ${action} task`)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your financial overview at a glance.
        </p>
      </div>

      {/* Row 1: Key Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Net Worth"
          value={formatCurrency(netWorth)}
          icon={<TrendingUp className="size-4" />}
          valueClass={netWorth >= 0 ? 'text-emerald-600' : 'text-destructive'}
        />
        <MetricCard
          label="Available to Spend"
          value={formatCurrency(availableToSpend)}
          icon={<Wallet className="size-4" />}
        />
        <MetricCard
          label="Total Savings"
          value={formatCurrency(totalSavings)}
          icon={<PiggyBank className="size-4" />}
          valueClass="text-emerald-600"
        />
        <MetricCard
          label="Total Debt"
          value={formatCurrency(totalDebt)}
          icon={<CreditCard className="size-4" />}
          valueClass={totalDebt > 0 ? 'text-destructive' : ''}
        />
      </div>

      {/* Row 2: Budget & Recent Transactions */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Budget Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Monthly Budget</CardTitle>
            <Link href="/budget">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {activeBudget ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {formatMonth(activeBudget.year, activeBudget.month)}
                  </span>
                  <Badge variant="default">{formatBudgetStatus(activeBudget.status ?? 'active')}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Income</p>
                    <p className="text-sm font-semibold font-numbers text-emerald-600">
                      {formatCurrency(activeBudget.totalPlannedIncome ?? '0')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expenses</p>
                    <p className="text-sm font-semibold font-numbers text-destructive">
                      {formatCurrency(activeBudget.totalPlannedExpenses ?? '0')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unallocated</p>
                    <p className="text-sm font-semibold font-numbers">
                      {formatCurrency(activeBudget.unallocatedAmount ?? '0')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <p className="text-sm text-muted-foreground">No active budget this month.</p>
                <Link href="/budget">
                  <Button variant="outline" size="sm" className="mt-2">
                    Create Budget
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <Link href="/transactions">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No recent transactions.</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(t.transactionDate)}</p>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <Badge
                        variant={t.transactionType === 'credit' ? 'default' : 'destructive'}
                        className={t.transactionType === 'credit' ? 'bg-emerald-600 text-white' : ''}
                      >
                        {formatTransactionType(t.transactionType)}
                      </Badge>
                      <span className="font-numbers text-sm font-medium">
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Savings Goals & Tasks */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Savings Goals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Savings Goals</CardTitle>
            <Link href="/savings">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {savingsGoals.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No active savings goals.</p>
            ) : (
              <div className="space-y-4">
                {savingsGoals.slice(0, 4).map((goal) => {
                  const current = parseFloat(goal.currentAmount ?? '0')
                  const target = parseFloat(goal.targetAmount ?? '0')
                  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0

                  return (
                    <div key={goal.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{goal.name}</span>
                        <span className="font-numbers text-muted-foreground">
                          {formatCurrency(current)} / {formatCurrency(target)}
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">
              Tasks
              {pendingTasks.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingTasks.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No pending tasks.</p>
            ) : (
              <div className="space-y-3">
                {pendingTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <PriorityIcon priority={task.priority} />
                        <span className="truncate text-sm font-medium">{task.title}</span>
                      </div>
                      {task.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground pl-6">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => handleTaskAction(task.id, 'complete')}
                        title="Complete"
                      >
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => handleTaskAction(task.id, 'dismiss')}
                        title="Dismiss"
                      >
                        <XCircle className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon,
  valueClass = '',
}: {
  label: string
  value: string
  icon: React.ReactNode
  valueClass?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <p className="text-sm">{label}</p>
        </div>
        <p className={`mt-1 text-2xl font-semibold font-numbers ${valueClass}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function PriorityIcon({ priority }: { priority: string | null }) {
  if (priority === 'high') {
    return <AlertCircle className="size-4 shrink-0 text-destructive" />
  }
  if (priority === 'low') {
    return <AlertCircle className="size-4 shrink-0 text-muted-foreground/50" />
  }
  return <AlertCircle className="size-4 shrink-0 text-amber-500" />
}
