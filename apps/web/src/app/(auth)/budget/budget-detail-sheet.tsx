'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  BudgetWithDetails,
  BudgetItem,
  BudgetIncome,
  PlannedOneOff,
  Account,
  Category,
} from '@fin/core'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { apiClient, ApiError } from '@/lib/api-client'
import { formatCurrency, formatDate, formatMonth, formatBudgetStatus } from '@/lib/format'
import { BudgetItemForm } from './budget-item-form'
import { BudgetIncomeForm } from './budget-income-form'
import { PlannedOneOffForm } from './planned-one-off-form'

type ItemDialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; item: BudgetItem }

type IncomeDialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; income: BudgetIncome }

type OneOffDialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; oneOff: PlannedOneOff }

interface BudgetDetailSheetProps {
  budgetId: string
  accounts: Account[]
  categories: Category[]
  onClose: () => void
  onMutate: () => void
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' {
  if (status === 'active') return 'default'
  if (status === 'draft') return 'secondary'
  return 'outline'
}

function formatSurplusAction(action: string | null): string {
  if (!action) return '-'
  const labels: Record<string, string> = {
    rollover: 'Rollover',
    savings: 'Savings',
    general: 'General',
  }
  return labels[action] ?? action
}

export function BudgetDetailSheet({
  budgetId,
  accounts,
  categories,
  onClose,
  onMutate,
}: BudgetDetailSheetProps) {
  const [detail, setDetail] = useState<BudgetWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [itemDialog, setItemDialog] = useState<ItemDialogState>({ type: 'closed' })
  const [incomeDialog, setIncomeDialog] = useState<IncomeDialogState>({ type: 'closed' })
  const [oneOffDialog, setOneOffDialog] = useState<OneOffDialogState>({ type: 'closed' })

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]))

  const fetchDetail = useCallback(async () => {
    try {
      const data = await apiClient.get<BudgetWithDetails>(`/api/budgets/${budgetId}`)
      setDetail(data)
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      }
      onClose()
    }
  }, [budgetId, onClose])

  useEffect(() => {
    setIsLoading(true)
    fetchDetail().finally(() => setIsLoading(false))
  }, [fetchDetail])

  async function handleNestedSuccess() {
    setItemDialog({ type: 'closed' })
    setIncomeDialog({ type: 'closed' })
    setOneOffDialog({ type: 'closed' })
    await fetchDetail()
    onMutate()
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await apiClient.delete(`/api/budgets/${budgetId}/items/${itemId}`)
      toast.success('Allocation removed')
      await fetchDetail()
      onMutate()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to remove allocation')
      }
    }
  }

  async function handleDeleteIncome(incomeId: string) {
    try {
      await apiClient.delete(`/api/budgets/${budgetId}/incomes/${incomeId}`)
      toast.success('Income removed')
      await fetchDetail()
      onMutate()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to remove income')
      }
    }
  }

  async function handleDeleteOneOff(oneOffId: string) {
    try {
      await apiClient.delete(`/api/budgets/${budgetId}/planned-one-offs/${oneOffId}`)
      toast.success('One-off removed')
      await fetchDetail()
      onMutate()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to remove one-off')
      }
    }
  }

  async function handleActivate() {
    try {
      await apiClient.post(`/api/budgets/${budgetId}/activate`, {})
      toast.success('Budget activated')
      await fetchDetail()
      onMutate()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to activate budget')
      }
    }
  }

  async function handleClose() {
    try {
      await apiClient.post(`/api/budgets/${budgetId}/close`, {})
      toast.success('Budget closed')
      await fetchDetail()
      onMutate()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to close budget')
      }
    }
  }

  if (isLoading || !detail) {
    return (
      <>
        <SheetHeader>
          <div className="h-6 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        </SheetHeader>
        <div className="flex-1 space-y-4 p-4">
          <div className="h-2 w-full rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                <div className="h-5 w-24 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  const isClosed = detail.status === 'closed'
  const unallocated = parseFloat(detail.unallocatedAmount ?? '0')
  const allocatedCategoryIds = new Set(detail.items.map((i) => i.categoryId))

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          {formatMonth(detail.year, detail.month)}
          <Badge variant={statusBadgeVariant(detail.status)}>
            {formatBudgetStatus(detail.status)}
          </Badge>
        </SheetTitle>
        <SheetDescription className="flex items-center gap-2">
          {detail.status === 'draft' && (
            <Button size="sm" variant="default" onClick={handleActivate}>
              Activate
            </Button>
          )}
          {detail.status === 'active' && (
            <Button size="sm" variant="outline" onClick={handleClose}>
              <Lock className="mr-2 size-3" />
              Close
            </Button>
          )}
          {isClosed && (
            <span className="text-xs text-muted-foreground">Read-only</span>
          )}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 space-y-6">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Planned Income</span>
            <p className="font-medium text-emerald-600 dark:text-emerald-400">
              {formatCurrency(detail.totalPlannedIncome ?? '0')}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Planned Expenses</span>
            <p className="font-medium text-destructive">
              {formatCurrency(detail.totalPlannedExpenses ?? '0')}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Unallocated</span>
            <p className={`font-medium ${unallocated < 0 ? 'text-destructive' : unallocated > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
              {formatCurrency(unallocated)}
            </p>
          </div>
        </div>

        {detail.notes && (
          <p className="text-sm text-muted-foreground">{detail.notes}</p>
        )}

        <Separator />

        {/* Section 1: Category Allocations */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Allocations</h3>
            {!isClosed && (
              <Button size="sm" onClick={() => setItemDialog({ type: 'create' })}>
                <Plus className="mr-2 size-4" />
                Add
              </Button>
            )}
          </div>
          {detail.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No category allocations yet.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Surplus</TableHead>
                    {!isClosed && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {categoryMap.get(item.categoryId) ?? 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right font-numbers">
                        {formatCurrency(item.plannedAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {formatSurplusAction(item.surplusAction)}
                        </Badge>
                      </TableCell>
                      {!isClosed && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setItemDialog({ type: 'edit', item })}
                              >
                                <Pencil className="mr-2 size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 size-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Separator />

        {/* Section 2: Income Sources */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Income</h3>
            {!isClosed && (
              <Button size="sm" onClick={() => setIncomeDialog({ type: 'create' })}>
                <Plus className="mr-2 size-4" />
                Add
              </Button>
            )}
          </div>
          {detail.incomes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No income sources yet.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Confirmed</TableHead>
                    {!isClosed && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.incomes.map((income) => (
                    <TableRow key={income.id}>
                      <TableCell className="font-medium">{income.name}</TableCell>
                      <TableCell className="text-right font-numbers text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(income.expectedAmount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(income.expectedDate)}
                      </TableCell>
                      <TableCell>
                        {income.isConfirmed && (
                          <Badge className="bg-emerald-600 text-white">
                            <Check className="mr-1 size-3" />
                            Yes
                          </Badge>
                        )}
                      </TableCell>
                      {!isClosed && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setIncomeDialog({ type: 'edit', income })}
                              >
                                <Pencil className="mr-2 size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteIncome(income.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 size-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Separator />

        {/* Section 3: Planned One-Offs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">One-Off Expenses</h3>
            {!isClosed && (
              <Button size="sm" onClick={() => setOneOffDialog({ type: 'create' })}>
                <Plus className="mr-2 size-4" />
                Add
              </Button>
            )}
          </div>
          {detail.plannedOneOffs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No planned one-offs yet.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Done</TableHead>
                    {!isClosed && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.plannedOneOffs.map((oneOff) => (
                    <TableRow key={oneOff.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{oneOff.description}</span>
                          <p className="text-xs text-muted-foreground">
                            {accountMap.get(oneOff.accountId) ?? ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-numbers">
                        {formatCurrency(oneOff.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(oneOff.expectedDate)}
                      </TableCell>
                      <TableCell>
                        {oneOff.isCompleted && (
                          <Badge className="bg-emerald-600 text-white">
                            <Check className="mr-1 size-3" />
                            Done
                          </Badge>
                        )}
                      </TableCell>
                      {!isClosed && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setOneOffDialog({ type: 'edit', oneOff })}
                              >
                                <Pencil className="mr-2 size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteOneOff(oneOff.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 size-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Item Dialog */}
      <Dialog
        open={itemDialog.type === 'create' || itemDialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) setItemDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-md">
          <BudgetItemForm
            budgetId={budgetId}
            item={itemDialog.type === 'edit' ? itemDialog.item : undefined}
            categories={categories.filter(
              (c) =>
                itemDialog.type === 'edit'
                  ? c.id === itemDialog.item.categoryId || !allocatedCategoryIds.has(c.id)
                  : !allocatedCategoryIds.has(c.id),
            )}
            onSuccess={handleNestedSuccess}
            onCancel={() => setItemDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {/* Income Dialog */}
      <Dialog
        open={incomeDialog.type === 'create' || incomeDialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) setIncomeDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-md">
          <BudgetIncomeForm
            budgetId={budgetId}
            income={incomeDialog.type === 'edit' ? incomeDialog.income : undefined}
            onSuccess={handleNestedSuccess}
            onCancel={() => setIncomeDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {/* One-Off Dialog */}
      <Dialog
        open={oneOffDialog.type === 'create' || oneOffDialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) setOneOffDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-md">
          <PlannedOneOffForm
            budgetId={budgetId}
            oneOff={oneOffDialog.type === 'edit' ? oneOffDialog.oneOff : undefined}
            accounts={accounts}
            categories={categories}
            onSuccess={handleNestedSuccess}
            onCancel={() => setOneOffDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
