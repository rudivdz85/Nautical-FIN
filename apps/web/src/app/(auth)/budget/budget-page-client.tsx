'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Budget, Account, Category } from '@fin/core'
import {
  Plus,
  MoreHorizontal,
  Eye,
  Trash2,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { formatCurrency, formatMonth, formatBudgetStatus } from '@/lib/format'
import { BudgetForm } from './budget-form'
import { BudgetDeleteDialog } from './budget-delete-dialog'
import { BudgetDetailSheet } from './budget-detail-sheet'

type DialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'delete'; budget: Budget }
  | { type: 'detail'; budgetId: string }

interface BudgetPageClientProps {
  initialBudgets: Budget[]
  accounts: Account[]
  categories: Category[]
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' {
  if (status === 'active') return 'default'
  if (status === 'draft') return 'secondary'
  return 'outline'
}

export function BudgetPageClient({ initialBudgets, accounts, categories }: BudgetPageClientProps) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogState>({ type: 'closed' })

  function handleSuccess() {
    setDialog({ type: 'closed' })
    router.refresh()
  }

  const activeBudgets = initialBudgets.filter((b) => b.status === 'active')
  const totalPlannedIncome = activeBudgets.reduce(
    (sum, b) => sum + parseFloat(b.totalPlannedIncome ?? '0'),
    0,
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Budget</h1>
          <p className="text-sm text-muted-foreground">
            Plan and manage your monthly budgets.
          </p>
        </div>
        <Button onClick={() => setDialog({ type: 'create' })}>
          <Plus className="mr-2 size-4" />
          Create Budget
        </Button>
      </div>

      {initialBudgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Wallet className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No budgets yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first monthly budget to start planning your finances.
          </p>
          <Button className="mt-6" onClick={() => setDialog({ type: 'create' })}>
            <Plus className="mr-2 size-4" />
            Create Your First Budget
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Active Budgets</p>
                <p className="text-2xl font-semibold font-numbers">
                  {activeBudgets.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Planned Income (Active)</p>
                <p className="text-2xl font-semibold font-numbers text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalPlannedIncome)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Unallocated</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialBudgets.map((budget) => {
                  const unallocated = parseFloat(budget.unallocatedAmount ?? '0')
                  return (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium">
                        {formatMonth(budget.year, budget.month)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(budget.status)}>
                          {formatBudgetStatus(budget.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-numbers text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(budget.totalPlannedIncome ?? '0')}
                      </TableCell>
                      <TableCell className="text-right font-numbers text-destructive">
                        {formatCurrency(budget.totalPlannedExpenses ?? '0')}
                      </TableCell>
                      <TableCell
                        className={`text-right font-numbers ${unallocated < 0 ? 'text-destructive' : ''}`}
                      >
                        {formatCurrency(unallocated)}
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
                              onClick={() =>
                                setDialog({ type: 'detail', budgetId: budget.id })
                              }
                            >
                              <Eye className="mr-2 size-4" />
                              View Details
                            </DropdownMenuItem>
                            {budget.status !== 'closed' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setDialog({ type: 'delete', budget })
                                }
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 size-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
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
        open={dialog.type === 'create'}
        onOpenChange={(open) => { if (!open) setDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-md">
          <BudgetForm
            onSuccess={handleSuccess}
            onCancel={() => setDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {dialog.type === 'delete' && (
        <BudgetDeleteDialog
          budget={dialog.budget}
          onSuccess={handleSuccess}
          onCancel={() => setDialog({ type: 'closed' })}
        />
      )}

      <Sheet
        open={dialog.type === 'detail'}
        onOpenChange={(open) => { if (!open) setDialog({ type: 'closed' }) }}
      >
        <SheetContent className="sm:max-w-2xl overflow-hidden flex flex-col">
          {dialog.type === 'detail' && (
            <BudgetDetailSheet
              budgetId={dialog.budgetId}
              accounts={accounts}
              categories={categories}
              onClose={() => setDialog({ type: 'closed' })}
              onMutate={() => router.refresh()}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
