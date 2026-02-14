'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Income, Account } from '@fin/core'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  Banknote,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { formatCurrency, formatFrequency, formatDate } from '@/lib/format'
import { apiClient, ApiError } from '@/lib/api-client'
import { IncomeForm } from './income-form'
import { IncomeDeleteDialog } from './income-delete-dialog'

type DialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; income: Income }
  | { type: 'delete'; income: Income }

interface IncomesPageClientProps {
  initialIncomes: Income[]
  accounts: Account[]
}

export function IncomesPageClient({ initialIncomes, accounts }: IncomesPageClientProps) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogState>({ type: 'closed' })

  function handleSuccess() {
    setDialog({ type: 'closed' })
    router.refresh()
  }

  const activeIncomes = initialIncomes.filter((i) => i.isActive)
  const totalMonthlyIncome = activeIncomes.reduce((sum, i) => {
    const amount = parseFloat(i.amount)
    if (i.frequency === 'weekly') return sum + amount * 4.33
    if (i.frequency === 'yearly') return sum + amount / 12
    return sum + amount
  }, 0)
  const primarySalary = activeIncomes.find((i) => i.isPrimarySalary)

  async function handleConfirm(income: Income) {
    try {
      const today = new Date().toISOString().split('T')[0]
      await apiClient.post(`/api/incomes/${income.id}/confirm`, { actualDate: today })
      toast.success(`${income.name} confirmed`)
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to confirm income')
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Incomes</h1>
          <p className="text-sm text-muted-foreground">
            Track your income sources and expected payments.
          </p>
        </div>
        <Button onClick={() => setDialog({ type: 'create' })}>
          <Plus className="mr-2 size-4" />
          Add Income
        </Button>
      </div>

      {initialIncomes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Banknote className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No income sources yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your income sources to track expected payments and confirm receipts.
          </p>
          <Button className="mt-6" onClick={() => setDialog({ type: 'create' })}>
            <Plus className="mr-2 size-4" />
            Add Your First Income
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Active Sources</p>
                <p className="text-2xl font-semibold font-numbers">
                  {activeIncomes.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Est. Monthly Income</p>
                <p className="text-2xl font-semibold font-numbers text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalMonthlyIncome)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Primary Salary</p>
                <p className="text-2xl font-semibold font-numbers text-emerald-600 dark:text-emerald-400">
                  {primarySalary ? formatCurrency(primarySalary.amount) : '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Expected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialIncomes.map((income) => (
                  <TableRow key={income.id} className={!income.isActive ? 'opacity-50' : undefined}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{income.name}</span>
                        {income.isPrimarySalary && (
                          <Badge variant="default" className="ml-2 text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-numbers text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(income.amount)}
                    </TableCell>
                    <TableCell>{formatFrequency(income.frequency)}</TableCell>
                    <TableCell>{formatDate(income.nextExpected)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {!income.isActive && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                        {income.isActive && income.confirmationRequiredMonthly && !income.isConfirmed && (
                          <Badge variant="secondary">Unconfirmed</Badge>
                        )}
                        {income.isActive && income.isConfirmed && (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-600/30">
                            Confirmed
                          </Badge>
                        )}
                      </div>
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
                          {income.isActive && income.confirmationRequiredMonthly && !income.isConfirmed && (
                            <DropdownMenuItem onClick={() => handleConfirm(income)}>
                              <Check className="mr-2 size-4" />
                              Confirm Received
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setDialog({ type: 'edit', income })}
                          >
                            <Pencil className="mr-2 size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDialog({ type: 'delete', income })}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
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
          <IncomeForm
            income={dialog.type === 'edit' ? dialog.income : undefined}
            accounts={accounts}
            onSuccess={handleSuccess}
            onCancel={() => setDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {dialog.type === 'delete' && (
        <IncomeDeleteDialog
          income={dialog.income}
          onSuccess={handleSuccess}
          onCancel={() => setDialog({ type: 'closed' })}
        />
      )}
    </div>
  )
}
