'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Budget, Transaction, SavingsGoal, Task, AiInsight, NetWorthSnapshot, Category, Actual } from '@fin/core'
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from 'recharts'
import { ChartTooltipContent, ChartEmptyState } from '@/components/ui/chart'
import {
  Wallet,
  TrendingUp,
  PiggyBank,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Camera,
  Sparkles,
  Lightbulb,
  Eye,
  X,
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
  formatShortDate,
  formatBudgetStatus,
} from '@/lib/format'

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

interface DashboardPageClientProps {
  netWorth: number
  availableToSpend: number
  totalSavings: number
  totalDebt: number
  activeBudget: Budget | null
  recentTransactions: Transaction[]
  savingsGoals: SavingsGoal[]
  pendingTasks: Task[]
  unreadInsights: AiInsight[]
  netWorthSnapshots: NetWorthSnapshot[]
  categories: Category[]
  monthlyActuals: Actual[]
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
  unreadInsights = [],
  netWorthSnapshots = [],
  categories = [],
  monthlyActuals = [],
}: DashboardPageClientProps) {
  const router = useRouter()
  const [snapshotting, setSnapshotting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const autoGenRan = useRef(false)

  useEffect(() => {
    if (autoGenRan.current) return
    autoGenRan.current = true
    apiClient.post('/api/recurring-transactions/auto-generate', {}).then((result) => {
      const generated = result as unknown[]
      if (generated.length > 0) {
        toast.success(`${generated.length} recurring transaction${generated.length > 1 ? 's' : ''} generated`)
        router.refresh()
      }
    }).catch(() => {
      // silent — auto-generation is best-effort
    })
  }, [router])

  const netWorthData = useMemo(() => {
    return [...netWorthSnapshots]
      .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))
      .map((s) => ({
        date: s.snapshotDate,
        netWorth: parseFloat(s.netWorth),
        assets: parseFloat(s.totalAssets),
        liabilities: parseFloat(s.totalLiabilities),
      }))
  }, [netWorthSnapshots])

  const spendingByCategory = useMemo(() => {
    const catMap = new Map<string, { name: string; total: number }>()
    for (const t of recentTransactions) {
      if (t.transactionType !== 'debit') continue
      const catId = t.categoryId ?? 'uncategorized'
      const cat = categories.find((c) => c.id === catId)
      const name = cat?.name ?? 'Uncategorized'
      const entry = catMap.get(catId) ?? { name, total: 0 }
      entry.total += parseFloat(t.amount)
      catMap.set(catId, entry)
    }
    return Array.from(catMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [recentTransactions, categories])

  const incomeVsExpenses = useMemo(() => {
    return [...monthlyActuals]
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
      .map((a) => ({
        month: formatMonth(a.year, a.month).slice(0, 3) + ' ' + a.year,
        income: parseFloat(a.totalIncome ?? '0'),
        expenses: parseFloat(a.totalExpenses ?? '0'),
      }))
  }, [monthlyActuals])

  async function handleTakeSnapshot() {
    setSnapshotting(true)
    try {
      await apiClient.post('/api/net-worth-snapshots/generate', {})
      toast.success('Net worth snapshot saved')
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to take snapshot')
      }
    } finally {
      setSnapshotting(false)
    }
  }

  async function handleGenerateInsights() {
    setAnalyzing(true)
    try {
      await apiClient.post('/api/ai-insights/generate', {})
      toast.success('Financial analysis complete')
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to generate insights')
      }
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleInsightAction(insightId: string, action: 'read' | 'dismiss') {
    try {
      await apiClient.post(`/api/ai-insights/${insightId}/${action}`, {})
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to update insight')
      }
    }
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your financial overview at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateInsights}
            disabled={analyzing}
          >
            <Sparkles className="mr-2 size-4" />
            {analyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTakeSnapshot}
            disabled={snapshotting}
          >
            <Camera className="mr-2 size-4" />
            {snapshotting ? 'Saving...' : 'Snapshot'}
          </Button>
        </div>
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

      {/* AI Insights */}
      {unreadInsights.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-4 text-amber-500" />
              AI Insights
              <Badge variant="secondary">{unreadInsights.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unreadInsights.slice(0, 5).map((insight) => (
                <div
                  key={insight.id}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <InsightTypeIcon type={insight.insightType} />
                      <p className="text-sm font-medium">{insight.title}</p>
                    </div>
                    <p className="mt-0.5 pl-6 text-xs text-muted-foreground line-clamp-2">
                      {insight.content}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => handleInsightAction(insight.id, 'read')}
                      title="Mark as read"
                    >
                      <Eye className="size-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => handleInsightAction(insight.id, 'dismiss')}
                      title="Dismiss"
                    >
                      <X className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row 2: Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Net Worth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {netWorthData.length < 2 ? (
              <div className="h-[220px]">
                <ChartEmptyState message="Take snapshots to see your net worth trend." />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={netWorthData}>
                  <defs>
                    <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => formatShortDate(v)}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatCurrency(v).replace(/,\d{2}$/, '')}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip content={<ChartTooltipContent labelFormatter={(l: string) => formatShortDate(l)} />} />
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    name="Net Worth"
                    stroke="#10b981"
                    fill="url(#netWorthGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {spendingByCategory.length === 0 ? (
              <div className="h-[220px]">
                <ChartEmptyState message="No spending data yet." />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie
                      data={spendingByCategory}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {spendingByCategory.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {spendingByCategory.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="truncate text-muted-foreground">{entry.name}</span>
                      <span className="ml-auto font-numbers font-medium">
                        {formatCurrency(entry.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {monthlyActuals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={incomeVsExpenses}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number) => formatCurrency(v).replace(/,\d{2}$/, '')}
                  tick={{ fontSize: 11 }}
                  width={80}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Row 3: Budget & Recent Transactions */}
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

function InsightTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'spending_alert':
      return <AlertCircle className="size-4 shrink-0 text-destructive" />
    case 'budget_warning':
      return <AlertCircle className="size-4 shrink-0 text-amber-500" />
    case 'savings_milestone':
      return <PiggyBank className="size-4 shrink-0 text-emerald-600" />
    case 'debt_progress':
      return <CreditCard className="size-4 shrink-0 text-blue-500" />
    default:
      return <Lightbulb className="size-4 shrink-0 text-amber-500" />
  }
}
