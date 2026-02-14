'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Category } from '@fin/core'
import { Plus, MoreHorizontal, Pencil, Trash2, Tags } from 'lucide-react'
import { DynamicIcon } from '@/components/dynamic-icon'
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
import { CategoryForm } from './category-form'
import { CategoryDeleteDialog } from './category-delete-dialog'

type DialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; category: Category }
  | { type: 'delete'; category: Category }

export function CategoriesPageClient({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogState>({ type: 'closed' })

  function handleSuccess() {
    setDialog({ type: 'closed' })
    router.refresh()
  }

  const incomeCategories = initialCategories.filter((c) => c.categoryType === 'income')
  const expenseCategories = initialCategories.filter((c) => c.categoryType === 'expense')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organize your transactions with income and expense categories.
          </p>
        </div>
        <Button onClick={() => setDialog({ type: 'create' })}>
          <Plus className="mr-2 size-4" />
          Add Category
        </Button>
      </div>

      {initialCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Tags className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No categories yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create categories to organize your income and expenses.
          </p>
          <Button className="mt-6" onClick={() => setDialog({ type: 'create' })}>
            <Plus className="mr-2 size-4" />
            Add Your First Category
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          <CategorySection
            title="Income"
            categories={incomeCategories}
            allCategories={initialCategories}
            onEdit={(category) => setDialog({ type: 'edit', category })}
            onDelete={(category) => setDialog({ type: 'delete', category })}
          />
          <CategorySection
            title="Expense"
            categories={expenseCategories}
            allCategories={initialCategories}
            onEdit={(category) => setDialog({ type: 'edit', category })}
            onDelete={(category) => setDialog({ type: 'delete', category })}
          />
        </div>
      )}

      <Dialog
        open={dialog.type === 'create' || dialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) setDialog({ type: 'closed' }) }}
      >
        <DialogContent className="sm:max-w-md">
          <CategoryForm
            category={dialog.type === 'edit' ? dialog.category : undefined}
            categories={initialCategories}
            onSuccess={handleSuccess}
            onCancel={() => setDialog({ type: 'closed' })}
          />
        </DialogContent>
      </Dialog>

      {dialog.type === 'delete' && (
        <CategoryDeleteDialog
          category={dialog.category}
          onSuccess={handleSuccess}
          onCancel={() => setDialog({ type: 'closed' })}
        />
      )}
    </div>
  )
}

function CategorySection({
  title,
  categories,
  allCategories,
  onEdit,
  onDelete,
}: {
  title: string
  categories: Category[]
  allCategories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}) {
  if (categories.length === 0) return null

  return (
    <div>
      <h2 className="mb-3 text-lg font-medium">{title} Categories</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => {
              const parent = category.parentId
                ? allCategories.find((c) => c.id === category.parentId)
                : null

              return (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {category.icon && <DynamicIcon name={category.icon} className="size-4 text-muted-foreground" />}
                      {category.name}
                      {category.isSystem && (
                        <Badge variant="outline" className="text-xs">System</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {parent?.name ?? '-'}
                  </TableCell>
                  <TableCell>
                    {category.color ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="size-4 rounded-full border"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-xs text-muted-foreground">{category.color}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.isHidden ? 'secondary' : 'default'}>
                      {category.isHidden ? 'Hidden' : 'Visible'}
                    </Badge>
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
                        <DropdownMenuItem onClick={() => onEdit(category)}>
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        {!category.isSystem && (
                          <DropdownMenuItem
                            onClick={() => onDelete(category)}
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
    </div>
  )
}
