'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  ActualWithDetails,
  ActualCategory,
  BalanceConfirmation,
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
  PlayCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { formatCurrency, formatMonth } from '@/lib/format'
import { ActualCategoryForm } from './actual-category-form'
import { BalanceConfirmationForm } from './balance-confirmation-form'
import { SurplusAllocationForm } from './surplus-allocation-form'

type CategoryDialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; category: ActualCategory }

type ConfirmationDialogState =
  | { type: 'closed' }
  | { type: 'create' }

type AllocationDialogState =
  | { type: 'closed' }
  | { type: 'create' }

interface ActualDetailSheetProps {
  actualId: string
  accounts: Account[]
  categories: Category[]
  onClose: () => void
  onMutate: () => void
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' {
  if (status === 'reconciling') return 'default'
  if (status === 'open') return 'secondary'
  return 'outline'
}

function formatActualStatus(status: string): string {
  const labels: Record<string, string> = {
    open: 'Open',
    reconciling: 'Reconciling',
    closed: 'Closed',
  }
  return labels[status] ?? status
}

function formatAllocationAction(action: string): string {
  const labels: Record<string, string> = {
    rollover: 'Rollover',
    savings: 'Savings',
    general: 'General',
  }
  return labels[action] ?? action
}

export function ActualDetailSheet({
  actualId,
  accounts,
  categories,
  onClose,
  onMutate,
}: ActualDetailSheetProps) {
  const [detail, setDetail] = useState<ActualWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogState>({ type: 'closed' })
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState>({ type: 'closed' })
  const [allocationDialog, setAllocationDialog] = useState<AllocationDialogState>({ type: 'closed' })
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmBalance, setConfirmBalance] = useState('')

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]))

  const fetchDetail = useCallback(async () => {
    try {
      const data = await apiClient.get<ActualWithDetails>(`/api/actuals/${actualId}`)
      setDetail(data)
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      }
      onClose()
    }
  }, [actualId, onClose])

  useEffect(() => {
    setIsLoading(true)
    fetchDetail().finally(() => setIsLoading(false))
  }, [fetchDetail])

  async function handleNestedSuccess() {
    setCategoryDialog({ type: 'closed' })
    setConfirmationDialog({ type: 'closed' })
    setAllocationDialog({ type: 'closed' })
    await fetchDetail()
    onMutate()
  }

  async function handleStartReconciling() {
    try {
      await apiClient.post(`/api/actuals/${actualId}/reconcile`, {})
      toast.success('Reconciliation started')
      await fetchDetail()
      onMutate()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to start reconciliation')
      }
    }
  }

  async function handleCloseActual() {
    try {
      await apiClient.post(`/api/actuals/${actualId}/close`, {})
      toast.success('Month closed')
      await fetchDetail()
      onMutate()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to close month')
      }
    }
  }

  async function handleDeleteCategory(catId: string) {
    try {
      await apiClient.delete(`/api/actuals/${actualId}/categories/${catId}`)
      toast.success('Category removed')
      await fetchDetail()
      onMutate()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to remove category')
      }
    }
  }

  async function handleConfirmBalance(confirmation: BalanceConfirmation) {
    if (!confirmBalance) return
    try {
      await apiClient.post(
        `/api/actuals/${actualId}/balance-confirmations/${confirmation.id}/confirm`,
        { confirmedBalance: confirmBalance },
      )
      toast.success('Balance confirmed')
      setConfirmingId(null)
      setConfirmBalance('')
      await fetchDetail()
      onMutate()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to confirm balance')
      }
    }
  }

  async function handleDeleteConfirmation(confirmationId: string) {
    try {
      await apiClient.delete(`/api/actuals/${actualId}/balance-confirmations/${confirmationId}`)
      toast.success('Confirmation removed')
      await fetchDetail()
      onMutate()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to remove confirmation')
      }
    }
  }

  async function handleActionAllocation(allocationId: string) {
    try {
      await apiClient.post(
        `/api/actuals/${actualId}/surplus-allocations/${allocationId}/action`,
        {},
      )
      toast.success('Allocation actioned')
      await fetchDetail()
      onMutate()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to action allocation')
      }
    }
  }

  async function handleDeleteAllocation(allocationId: string) {
    try {
      await apiClient.delete(`/api/actuals/${actualId}/surplus-allocations/${allocationId}`)
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

  if (isLoading || !detail) {
    return (
      <>
        <SheetHeader>
          <div className="h-6 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        </SheetHeader>
        <div className="flex-1 space-y-4 p-4">
          <div className="h-2 w-full rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
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
  const trackedCategoryIds = new Set(detail.categories.map((c) => c.categoryId))
  const confirmedAccountIds = new Set(detail.balanceConfirmations.map((bc) => bc.accountId))

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          {formatMonth(detail.year, detail.month)}
          <Badge variant={statusBadgeVariant(detail.status)}>
            {formatActualStatus(detail.status)}
          </Badge>
        </SheetTitle>
        <SheetDescription className="flex items-center gap-2">
          {detail.status === 'open' && (
            <Button size="sm" variant="default" onClick={handleStartReconciling}>
              <PlayCircle className="mr-2 size-3" />
              Start Reconciling
            </Button>
          )}
          {detail.status === 'reconciling' && (
            <Button size="sm" variant="outline" onClick={handleCloseActual}>
              <Lock className="mr-2 size-3" />
              Close Month
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
            <span className="text-muted-foreground">Total Income</span>
            <p className="font-medium text-emerald-600 dark:text-emerald-400">
              {formatCurrency(detail.totalIncome ?? '0')}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Total Expenses</span>
            <p className="font-medium text-destructive">
              {formatCurrency(detail.totalExpenses ?? '0')}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Net Savings</span>
            <p className={`font-medium ${parseFloat(detail.netSavings ?? '0') >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
              {formatCurrency(detail.netSavings ?? '0')}
            </p>
          </div>
        </div>

        {detail.notes && (
          <p className="text-sm text-muted-foreground">{detail.notes}</p>
        )}

        <Separator />

        {/* Section 1: Budget vs Actual Categories */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Budget vs Actual</h3>
            {!isClosed && (
              <Button size="sm" onClick={() => setCategoryDialog({ type: 'create' })}>
                <Plus className="mr-2 size-4" />
                Add
              </Button>
            )}
          </div>
          {detail.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No categories tracked yet.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Budgeted</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    {!isClosed && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.categories.map((cat) => {
                    const budgeted = parseFloat(cat.budgetedAmount ?? '0')
                    const actual = parseFloat(cat.totalAmount ?? '0')
                    const variance = budgeted - actual
                    return (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">
                          {categoryMap.get(cat.categoryId) ?? 'Unknown'}
                        </TableCell>
                        <TableCell className="text-right font-numbers">
                          {budgeted > 0 ? formatCurrency(budgeted) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-numbers">
                          {formatCurrency(actual)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-numbers ${variance > 0 ? 'text-emerald-600 dark:text-emerald-400' : variance < 0 ? 'text-destructive' : ''}`}
                        >
                          {budgeted > 0 ? formatCurrency(variance) : '-'}
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
                                  onClick={() => setCategoryDialog({ type: 'edit', category: cat })}
                                >
                                  <Pencil className="mr-2 size-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteCategory(cat.id)}
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
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Separator />

        {/* Section 2: Balance Confirmations */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Balance Confirmations</h3>
            {!isClosed && (
              <Button size="sm" onClick={() => setConfirmationDialog({ type: 'create' })}>
                <Plus className="mr-2 size-4" />
                Add
              </Button>
            )}
          </div>
          {detail.balanceConfirmations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No balance confirmations yet.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Confirmed</TableHead>
                    <TableHead>Status</TableHead>
                    {!isClosed && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.balanceConfirmations.map((bc) => (
                    <TableRow key={bc.id}>
                      <TableCell className="font-medium">
                        {accountMap.get(bc.accountId) ?? 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right font-numbers">
                        {formatCurrency(bc.expectedBalance)}
                      </TableCell>
                      <TableCell className="text-right font-numbers">
                        {confirmingId === bc.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={confirmBalance}
                              onChange={(e) => setConfirmBalance(e.target.value)}
                              className="w-28 h-7 text-right"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => handleConfirmBalance(bc)}
                            >
                              <Check className="size-4" />
                            </Button>
                          </div>
                        ) : bc.confirmedBalance ? (
                          formatCurrency(bc.confirmedBalance)
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {bc.isConfirmed ? (
                          <Badge className="bg-emerald-600 text-white">
                            <Check className="mr-1 size-3" />
                            Confirmed
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
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
                              {!bc.isConfirmed && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setConfirmingId(bc.id)
                                    setConfirmBalance(bc.expectedBalance)
                                  }}
                                >
                                  <Check className="mr-2 size-4" />
                                  Confirm
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDeleteConfirmation(bc.id)}
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

        {/* Section 3: Surplus Allocations */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Surplus Allocations</h3>
            {!isClosed && (
              <Button size="sm" onClick={() => setAllocationDialog({ type: 'create' })}>
                <Plus className="mr-2 size-4" />
                Add
              </Button>
            )}
          </div>
          {detail.surplusAllocations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No surplus allocations yet.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    {!isClosed && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.surplusAllocations.map((alloc) => (
                    <TableRow key={alloc.id}>
                      <TableCell className="font-medium">
                        {formatAllocationAction(alloc.action)}
                      </TableCell>
                      <TableCell className="text-right font-numbers">
                        {formatCurrency(alloc.amount)}
                      </TableCell>
                      <TableCell>
                        {alloc.isActioned ? (
                          <Badge className="bg-emerald-600 text-white">
                            <Check className="mr-1 size-3" />
                            Done
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
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
                              {!alloc.isActioned && (
                                <DropdownMenuItem
                                  onClick={() => handleActionAllocation(alloc.id)}
                                >
                                  <Check className="mr-2 size-4" />
                                  Mark Done
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDeleteAllocation(alloc.id)}
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

      {/* Category Dialog */}
      <Dialog
        open={categoryDialog.type === 'create' || categoryDialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) setCategoryDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-md">
          <ActualCategoryForm
            actualId={actualId}
            category={categoryDialog.type === 'edit' ? categoryDialog.category : undefined}
            categories={categories.filter(
              (c) =>
                categoryDialog.type === 'edit'
                  ? c.id === categoryDialog.category.categoryId || !trackedCategoryIds.has(c.id)
                  : !trackedCategoryIds.has(c.id),
            )}
            onSuccess={handleNestedSuccess}
            onCancel={() => setCategoryDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {/* Balance Confirmation Dialog */}
      <Dialog
        open={confirmationDialog.type === 'create'}
        onOpenChange={(open) => { if (!open) setConfirmationDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-md">
          <BalanceConfirmationForm
            actualId={actualId}
            accounts={accounts.filter((a) => !confirmedAccountIds.has(a.id))}
            onSuccess={handleNestedSuccess}
            onCancel={() => setConfirmationDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {/* Surplus Allocation Dialog */}
      <Dialog
        open={allocationDialog.type === 'create'}
        onOpenChange={(open) => { if (!open) setAllocationDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-md">
          <SurplusAllocationForm
            actualId={actualId}
            onSuccess={handleNestedSuccess}
            onCancel={() => setAllocationDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
