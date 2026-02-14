'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { createCategorySchema, type Category } from '@fin/core'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { apiClient, ApiError } from '@/lib/api-client'

type FormValues = z.input<typeof createCategorySchema>

interface CategoryFormProps {
  category?: Category
  categories: Category[]
  onSuccess: () => void
  onCancel: () => void
}

export function CategoryForm({ category, categories, onSuccess, onCancel }: CategoryFormProps) {
  const isEditing = !!category

  const form = useForm<FormValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: category
      ? {
          name: category.name,
          categoryType: category.categoryType,
          parentId: category.parentId ?? undefined,
          icon: category.icon ?? undefined,
          color: category.color ?? undefined,
        }
      : {
          name: '',
          categoryType: 'expense',
        },
  })

  const categoryType = form.watch('categoryType')
  const parentOptions = categories.filter(
    (c) => c.categoryType === categoryType && c.id !== category?.id && !c.parentId,
  )

  async function onSubmit(data: FormValues) {
    try {
      if (isEditing) {
        await apiClient.patch<Category>(`/api/categories/${category.id}`, data)
        toast.success('Category updated')
      } else {
        await apiClient.post<Category>('/api/categories', data)
        toast.success('Category created')
      }
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Something went wrong')
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category' : 'Add Category'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update category details.' : 'Create a new income or expense category.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Groceries" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isEditing}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {parentOptions.length > 0 && (
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="None (top-level)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {parentOptions.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 🛒" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="#5B4B8A" {...field} value={field.value ?? ''} />
                    </FormControl>
                    {field.value && /^#[0-9a-fA-F]{6}$/.test(field.value) && (
                      <div
                        className="size-9 shrink-0 rounded-md border"
                        style={{ backgroundColor: field.value }}
                      />
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? (isEditing ? 'Saving...' : 'Creating...')
              : (isEditing ? 'Save Changes' : 'Add Category')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
