'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Account } from '@fin/core'
import { Plus, MoreHorizontal, Pencil, Trash2, Landmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { formatCurrency, formatAccountType } from '@/lib/format'
import { AccountForm } from './account-form'
import { AccountDeleteDialog } from './account-delete-dialog'

type DialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; account: Account }
  | { type: 'delete'; account: Account }

export function AccountsPageClient({ initialAccounts }: { initialAccounts: Account[] }) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogState>({ type: 'closed' })

  function handleSuccess() {
    setDialog({ type: 'closed' })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your bank accounts and wallets.
          </p>
        </div>
        <Button onClick={() => setDialog({ type: 'create' })}>
          <Plus className="mr-2 size-4" />
          Add Account
        </Button>
      </div>

      {initialAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Landmark className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No accounts yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first bank account to start tracking your finances.
          </p>
          <Button className="mt-6" onClick={() => setDialog({ type: 'create' })}>
            <Plus className="mr-2 size-4" />
            Add Your First Account
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>
                    <Badge variant={account.classification === 'spending' ? 'default' : 'secondary'}>
                      {formatAccountType(account.accountType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {account.institution || '-'}
                  </TableCell>
                  <TableCell className={`text-right font-numbers ${parseFloat(account.currentBalance) < 0 ? 'text-destructive' : ''}`}>
                    {formatCurrency(account.currentBalance, account.currency)}
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
                        <DropdownMenuItem onClick={() => setDialog({ type: 'edit', account })}>
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDialog({ type: 'delete', account })}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={dialog.type === 'create' || dialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) setDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-lg">
          <AccountForm
            account={dialog.type === 'edit' ? dialog.account : undefined}
            onSuccess={handleSuccess}
            onCancel={() => setDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {dialog.type === 'delete' && (
        <AccountDeleteDialog
          account={dialog.account}
          onSuccess={handleSuccess}
          onCancel={() => setDialog({ type: 'closed' })}
        />
      )}
    </div>
  )
}
