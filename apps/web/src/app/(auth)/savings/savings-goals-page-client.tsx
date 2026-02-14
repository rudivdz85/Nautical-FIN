'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SavingsGoal, Account } from '@fin/core'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { ChartTooltipContent } from '@/components/ui/chart'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  PiggyBank,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { formatCurrency, formatGoalType } from '@/lib/format'
import { SavingsGoalForm } from './savings-goal-form'
import { SavingsGoalDeleteDialog } from './savings-goal-delete-dialog'
import { SavingsGoalDetailSheet } from './savings-goal-detail-sheet'

type GoalDialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; goal: SavingsGoal }
  | { type: 'delete'; goal: SavingsGoal }
  | { type: 'detail'; goalId: string }

interface SavingsGoalsPageClientProps {
  initialGoals: SavingsGoal[]
  accounts: Account[]
}

function calculateProgress(currentAmount: string | null, targetAmount: string | null): number {
  if (!currentAmount || !targetAmount) return 0
  const current = parseFloat(currentAmount)
  const target = parseFloat(targetAmount)
  if (target <= 0) return 0
  return Math.min(Math.max(Math.round((current / target) * 100), 0), 100)
}

export function SavingsGoalsPageClient({ initialGoals, accounts }: SavingsGoalsPageClientProps) {
  const router = useRouter()
  const [dialog, setDialog] = useState<GoalDialogState>({ type: 'closed' })

  function handleSuccess() {
    setDialog({ type: 'closed' })
    router.refresh()
  }

  const totalSaved = initialGoals.reduce(
    (sum, g) => sum + parseFloat(g.currentAmount ?? '0'),
    0,
  )
  const totalMonthly = initialGoals.reduce((sum, g) => {
    return sum + (g.monthlyContribution ? parseFloat(g.monthlyContribution) : 0)
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Savings Goals</h1>
          <p className="text-sm text-muted-foreground">
            Track progress towards your savings goals.
          </p>
        </div>
        <Button onClick={() => setDialog({ type: 'create' })}>
          <Plus className="mr-2 size-4" />
          Add Goal
        </Button>
      </div>

      {initialGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <PiggyBank className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No savings goals yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a savings goal to start tracking your progress.
          </p>
          <Button className="mt-6" onClick={() => setDialog({ type: 'create' })}>
            <Plus className="mr-2 size-4" />
            Add Your First Goal
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Saved</p>
                <p className="text-2xl font-semibold font-numbers text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalSaved)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Monthly Target</p>
                <p className="text-2xl font-semibold font-numbers">
                  {formatCurrency(totalMonthly)}
                </p>
              </CardContent>
            </Card>
          </div>

          {initialGoals.filter((g) => g.targetAmount).length >= 2 && (
            <Card>
              <CardContent className="pt-6">
                <p className="mb-4 text-sm font-medium">Goal Progress</p>
                <ResponsiveContainer width="100%" height={Math.max(150, initialGoals.filter((g) => g.targetAmount).length * 50)}>
                  <BarChart
                    layout="vertical"
                    data={initialGoals
                      .filter((g) => g.targetAmount)
                      .map((g) => ({
                        name: g.name.length > 18 ? g.name.slice(0, 18) + '...' : g.name,
                        saved: parseFloat(g.currentAmount ?? '0'),
                        remaining: Math.max(0, parseFloat(g.targetAmount ?? '0') - parseFloat(g.currentAmount ?? '0')),
                      }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => formatCurrency(v).replace(/,\d{2}$/, '')}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="saved" name="Saved" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[180px]">Progress</TableHead>
                  <TableHead className="text-right">Saved</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialGoals.map((goal) => {
                  const percentage = calculateProgress(
                    goal.currentAmount,
                    goal.targetAmount,
                  )

                  return (
                    <TableRow key={goal.id}>
                      <TableCell>
                        <span className="font-medium">{goal.name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formatGoalType(goal.goalType)}</Badge>
                      </TableCell>
                      <TableCell>
                        {goal.targetAmount ? (
                          <div className="flex items-center gap-2">
                            <Progress value={percentage} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {percentage}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No target</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-numbers text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(goal.currentAmount ?? '0')}
                      </TableCell>
                      <TableCell className="text-right font-numbers">
                        {goal.monthlyContribution
                          ? formatCurrency(goal.monthlyContribution)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setDialog({ type: 'detail', goalId: goal.id })}
                            >
                              <Eye className="mr-2 size-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDialog({ type: 'edit', goal })}
                            >
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDialog({ type: 'delete', goal })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 size-4" />
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog
        open={dialog.type === 'create' || dialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) setDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-lg">
          <SavingsGoalForm
            goal={dialog.type === 'edit' ? dialog.goal : undefined}
            accounts={accounts}
            onSuccess={handleSuccess}
            onCancel={() => setDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {dialog.type === 'delete' && (
        <SavingsGoalDeleteDialog
          goal={dialog.goal}
          onSuccess={handleSuccess}
          onCancel={() => setDialog({ type: 'closed' })}
        />
      )}

      <Sheet
        open={dialog.type === 'detail'}
        onOpenChange={(open) => { if (!open) setDialog({ type: 'closed' }) }}
      >
        <SheetContent className="sm:max-w-lg overflow-hidden flex flex-col">
          {dialog.type === 'detail' && (
            <SavingsGoalDetailSheet
              goalId={dialog.goalId}
              accounts={accounts}
              onClose={() => setDialog({ type: 'closed' })}
              onMutate={() => router.refresh()}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
