'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Transaction, Account, Category } from '@fin/core'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Tags,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { apiClient, ApiError } from '@/lib/api-client'
import { formatCurrency, formatDate, formatTransactionType, formatTransactionSource } from '@/lib/format'
import { TransactionForm } from './transaction-form'
import { TransferForm } from './transfer-form'
import { TransactionDeleteDialog } from './transaction-delete-dialog'

type DialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'createTransfer' }
  | { type: 'edit'; transaction: Transaction }
  | { type: 'delete'; transaction: Transaction }

interface Filters {
  accountId: string
  categoryId: string
  transactionType: string
  startDate: string
  endDate: string
}

interface TransactionsPageClientProps {
  accounts: Account[]
  categories: Category[]
}

const ALL = '__all__'

export function TransactionsPageClient({ accounts, categories }: TransactionsPageClientProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialog, setDialog] = useState<DialogState>({ type: 'closed' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCategoryId, setBulkCategoryId] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    accountId: ALL,
    categoryId: ALL,
    transactionType: ALL,
    startDate: '',
    endDate: '',
  })

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]))
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.accountId !== ALL) params.set('accountId', filters.accountId)
      if (filters.categoryId !== ALL) params.set('categoryId', filters.categoryId)
      if (filters.transactionType !== ALL) params.set('type', filters.transactionType)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      const qs = params.toString()
      const data = await apiClient.get<Transaction[]>(`/api/transactions${qs ? `?${qs}` : ''}`)
      setTransactions(data)
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      }
      setTransactions([])
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  function handleSuccess() {
    setDialog({ type: 'closed' })
    setSelected(new Set())
    fetchTransactions()
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === transactions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(transactions.map((t) => t.id)))
    }
  }

  async function handleBulkCategorize() {
    if (!bulkCategoryId || selected.size === 0) return
    setBulkLoading(true)
    try {
      await apiClient.post('/api/transactions/bulk-categorize', {
        transactionIds: Array.from(selected),
        categoryId: bulkCategoryId,
      })
      toast.success(`${selected.size} transaction${selected.size > 1 ? 's' : ''} categorized`)
      setSelected(new Set())
      setBulkCategoryId('')
      fetchTransactions()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to categorize transactions')
      }
    } finally {
      setBulkLoading(false)
    }
  }

  const hasActiveFilters =
    filters.accountId !== ALL ||
    filters.categoryId !== ALL ||
    filters.transactionType !== ALL ||
    filters.startDate !== '' ||
    filters.endDate !== ''

  const totalInflows = transactions
    .filter((t) => t.transactionType === 'credit')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0)
  const totalOutflows = transactions
    .filter((t) => t.transactionType === 'debit')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0)
  const net = totalInflows - totalOutflows

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            View and manage all your transactions.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add
              <ChevronDown className="ml-2 size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDialog({ type: 'create' })}>
              <ArrowDownRight className="mr-2 size-4" />
              Transaction
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialog({ type: 'createTransfer' })}>
              <ArrowLeftRight className="mr-2 size-4" />
              Transfer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Select
            value={filters.accountId}
            onValueChange={(v) => setFilters((f) => ({ ...f, accountId: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select
            value={filters.categoryId}
            onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Select
            value={filters.transactionType}
            onValueChange={(v) => setFilters((f) => ({ ...f, transactionType: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Types</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
            placeholder="Start date"
          />
        </div>
        <div className="w-36">
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
            placeholder="End date"
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilters({
                accountId: ALL,
                categoryId: ALL,
                transactionType: ALL,
                startDate: '',
                endDate: '',
              })
            }
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Inflows</p>
            <p className="text-xl font-semibold font-numbers text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalInflows)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Outflows</p>
            <p className="text-xl font-semibold font-numbers text-destructive">
              {formatCurrency(totalOutflows)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Net</p>
            <p className={`text-xl font-semibold font-numbers ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
              {formatCurrency(net)}
            </p>
          </CardContent>
        </Card>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
          <Tags className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="w-44">
            <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            disabled={!bulkCategoryId || bulkLoading}
            onClick={handleBulkCategorize}
          >
            {bulkLoading ? 'Categorizing...' : 'Categorize'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-md border">
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <ArrowLeftRight className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">
            {hasActiveFilters ? 'No transactions match your filters' : 'No transactions yet'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasActiveFilters
              ? 'Try adjusting your filters or clear them to see all transactions.'
              : 'Add your first transaction to start tracking your finances.'}
          </p>
          {!hasActiveFilters && (
            <Button className="mt-6" onClick={() => setDialog({ type: 'create' })}>
              <Plus className="mr-2 size-4" />
              Add Your First Transaction
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={transactions.length > 0 && selected.size === transactions.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((txn) => {
                const amount = parseFloat(txn.amount)
                return (
                  <TableRow key={txn.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(txn.id)}
                        onCheckedChange={() => toggleSelect(txn.id)}
                        aria-label={`Select ${txn.description}`}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(txn.transactionDate)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{txn.description}</span>
                        {txn.merchantNormalized && txn.merchantNormalized !== txn.description && (
                          <p className="text-xs text-muted-foreground">{txn.merchantNormalized}</p>
                        )}
                      </div>
                      <div className="flex gap-1 mt-0.5">
                        {txn.source !== 'manual' && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {formatTransactionSource(txn.source)}
                          </Badge>
                        )}
                        {txn.isAiCategorized && !txn.isReviewed && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500 text-amber-600 dark:text-amber-400">
                            Needs Review
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {accountMap.get(txn.accountId) ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {txn.categoryId ? (
                        categoryMap.get(txn.categoryId) ?? '-'
                      ) : (
                        <span className="text-muted-foreground">Uncategorized</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {txn.transactionType === 'credit' ? (
                        <Badge className="bg-emerald-600 text-white">
                          <ArrowUpRight className="mr-1 size-3" />
                          {formatTransactionType(txn.transactionType)}
                        </Badge>
                      ) : txn.transactionType === 'debit' ? (
                        <Badge variant="destructive">
                          <ArrowDownRight className="mr-1 size-3" />
                          {formatTransactionType(txn.transactionType)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <ArrowLeftRight className="mr-1 size-3" />
                          {formatTransactionType(txn.transactionType)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-numbers ${
                        txn.transactionType === 'credit'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : txn.transactionType === 'debit'
                            ? 'text-destructive'
                            : ''
                      }`}
                    >
                      {txn.transactionType === 'debit' ? '-' : ''}
                      {formatCurrency(amount)}
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
                            onClick={() => setDialog({ type: 'edit', transaction: txn })}
                          >
                            <Pencil className="mr-2 size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDialog({ type: 'delete', transaction: txn })}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete
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
      )}

      <Dialog
        open={dialog.type === 'create' || dialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) setDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-lg">
          <TransactionForm
            transaction={dialog.type === 'edit' ? dialog.transaction : undefined}
            accounts={accounts}
            categories={categories}
            onSuccess={handleSuccess}
            onCancel={() => setDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog.type === 'createTransfer'}
        onOpenChange={(open) => { if (!open) setDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-lg">
          <TransferForm
            accounts={accounts}
            onSuccess={handleSuccess}
            onCancel={() => setDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {dialog.type === 'delete' && (
        <TransactionDeleteDialog
          transaction={dialog.transaction}
          onSuccess={handleSuccess}
          onCancel={() => setDialog({ type: 'closed' })}
        />
      )}
    </div>
  )
}
