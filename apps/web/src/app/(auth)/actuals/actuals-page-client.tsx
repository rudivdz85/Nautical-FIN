'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Actual, Account, Category } from '@fin/core'
import {
  Plus,
  MoreHorizontal,
  Eye,
  Trash2,
  ClipboardCheck,
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
import { formatCurrency, formatMonth } from '@/lib/format'
import { ActualForm } from './actual-form'
import { ActualDeleteDialog } from './actual-delete-dialog'
import { ActualDetailSheet } from './actual-detail-sheet'

type DialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'delete'; actual: Actual }
  | { type: 'detail'; actualId: string }

interface ActualsPageClientProps {
  initialActuals: Actual[]
  accounts: Account[]
  categories: Category[]
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

export function ActualsPageClient({
  initialActuals,
  accounts,
  categories,
}: ActualsPageClientProps) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogState>({ type: 'closed' })

  function handleSuccess() {
    setDialog({ type: 'closed' })
    router.refresh()
  }

  const openActuals = initialActuals.filter((a) => a.status !== 'closed')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Actuals & Retro</h1>
          <p className="text-sm text-muted-foreground">
            Month-end review: compare budget vs actual, confirm balances, and allocate surplus.
          </p>
        </div>
        <Button onClick={() => setDialog({ type: 'create' })}>
          <Plus className="mr-2 size-4" />
          Start Review
        </Button>
      </div>

      {initialActuals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <ClipboardCheck className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No month-end reviews yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Start your first month-end review to reconcile your budget with actual spending.
          </p>
          <Button className="mt-6" onClick={() => setDialog({ type: 'create' })}>
            <Plus className="mr-2 size-4" />
            Start Your First Review
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Open Reviews</p>
                <p className="text-2xl font-semibold font-numbers">
                  {openActuals.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-semibold font-numbers text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(
                    initialActuals.reduce(
                      (sum, a) => sum + parseFloat(a.totalIncome ?? '0'),
                      0,
                    ),
                  )}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-semibold font-numbers text-destructive">
                  {formatCurrency(
                    initialActuals.reduce(
                      (sum, a) => sum + parseFloat(a.totalExpenses ?? '0'),
                      0,
                    ),
                  )}
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
                  <TableHead className="text-right">Net Savings</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialActuals.map((actual) => {
                  const netSavings = parseFloat(actual.netSavings ?? '0')
                  return (
                    <TableRow key={actual.id}>
                      <TableCell className="font-medium">
                        {formatMonth(actual.year, actual.month)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(actual.status)}>
                          {formatActualStatus(actual.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-numbers text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(actual.totalIncome ?? '0')}
                      </TableCell>
                      <TableCell className="text-right font-numbers text-destructive">
                        {formatCurrency(actual.totalExpenses ?? '0')}
                      </TableCell>
                      <TableCell
                        className={`text-right font-numbers ${netSavings < 0 ? 'text-destructive' : netSavings > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        {formatCurrency(netSavings)}
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
                                setDialog({ type: 'detail', actualId: actual.id })
                              }
                            >
                              <Eye className="mr-2 size-4" />
                              View Details
                            </DropdownMenuItem>
                            {actual.status !== 'closed' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setDialog({ type: 'delete', actual })
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
          <ActualForm
            onSuccess={handleSuccess}
            onCancel={() => setDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {dialog.type === 'delete' && (
        <ActualDeleteDialog
          actual={dialog.actual}
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
            <ActualDetailSheet
              actualId={dialog.actualId}
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
