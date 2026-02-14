'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Debt, Account } from '@fin/core'
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
  CreditCard,
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
import { formatCurrency, formatDebtType } from '@/lib/format'
import { DebtForm } from './debt-form'
import { DebtDeleteDialog } from './debt-delete-dialog'
import { DebtDetailSheet } from './debt-detail-sheet'

type DebtDialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; debt: Debt }
  | { type: 'delete'; debt: Debt }
  | { type: 'detail'; debtId: string }

interface DebtsPageClientProps {
  initialDebts: Debt[]
  accounts: Account[]
}

function calculatePayoffPercentage(originalAmount: string, currentBalance: string): number {
  const original = parseFloat(originalAmount)
  const current = parseFloat(currentBalance)
  if (original <= 0) return 100
  const paid = original - current
  return Math.min(Math.max(Math.round((paid / original) * 100), 0), 100)
}

export function DebtsPageClient({ initialDebts, accounts }: DebtsPageClientProps) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DebtDialogState>({ type: 'closed' })

  function handleSuccess() {
    setDialog({ type: 'closed' })
    router.refresh()
  }

  const totalOutstanding = initialDebts.reduce(
    (sum, d) => sum + parseFloat(d.currentBalance),
    0,
  )
  const totalMonthly = initialDebts.reduce((sum, d) => {
    const payment = d.minimumPayment ?? d.fixedPayment
    return sum + (payment ? parseFloat(payment) : 0)
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Debts</h1>
          <p className="text-sm text-muted-foreground">
            Track your debts and repayment progress.
          </p>
        </div>
        <Button onClick={() => setDialog({ type: 'create' })}>
          <Plus className="mr-2 size-4" />
          Add Debt
        </Button>
      </div>

      {initialDebts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <CreditCard className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No debts yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your debts to track repayment progress.
          </p>
          <Button className="mt-6" onClick={() => setDialog({ type: 'create' })}>
            <Plus className="mr-2 size-4" />
            Add Your First Debt
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-semibold font-numbers text-destructive">
                  {formatCurrency(totalOutstanding)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Monthly Payments</p>
                <p className="text-2xl font-semibold font-numbers">
                  {formatCurrency(totalMonthly)}
                </p>
              </CardContent>
            </Card>
          </div>

          {initialDebts.length >= 2 && (
            <Card>
              <CardContent className="pt-6">
                <p className="mb-4 text-sm font-medium">Debt Payoff Progress</p>
                <ResponsiveContainer width="100%" height={Math.max(150, initialDebts.length * 50)}>
                  <BarChart
                    layout="vertical"
                    data={initialDebts.map((d) => ({
                      name: d.name.length > 18 ? d.name.slice(0, 18) + '...' : d.name,
                      paid: Math.max(0, parseFloat(d.originalAmount) - parseFloat(d.currentBalance)),
                      remaining: parseFloat(d.currentBalance),
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
                    <Bar dataKey="paid" name="Paid" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
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
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialDebts.map((debt) => {
                  const percentage = calculatePayoffPercentage(
                    debt.originalAmount,
                    debt.currentBalance,
                  )
                  const monthlyPayment = debt.minimumPayment ?? debt.fixedPayment

                  return (
                    <TableRow key={debt.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{debt.name}</span>
                          {debt.creditor && (
                            <p className="text-xs text-muted-foreground">{debt.creditor}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formatDebtType(debt.debtType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={percentage} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {percentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-numbers text-destructive">
                        {formatCurrency(debt.currentBalance)}
                      </TableCell>
                      <TableCell className="text-right font-numbers">
                        {monthlyPayment ? formatCurrency(monthlyPayment) : '-'}
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
                              onClick={() => setDialog({ type: 'detail', debtId: debt.id })}
                            >
                              <Eye className="mr-2 size-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDialog({ type: 'edit', debt })}
                            >
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDialog({ type: 'delete', debt })}
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
        <DialogContent className="sm:max-w-2xl">
          <DebtForm
            debt={dialog.type === 'edit' ? dialog.debt : undefined}
            accounts={accounts}
            onSuccess={handleSuccess}
            onCancel={() => setDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {dialog.type === 'delete' && (
        <DebtDeleteDialog
          debt={dialog.debt}
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
            <DebtDetailSheet
              debtId={dialog.debtId}
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
