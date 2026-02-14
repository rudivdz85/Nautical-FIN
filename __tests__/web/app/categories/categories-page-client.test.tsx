import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoriesPageClient } from '@/app/(auth)/categories/categories-page-client'
import type { Category } from '@fin/core'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error {
    code: string
    status: number
    constructor(code: string, message: string, status: number) {
      super(message)
      this.code = code
      this.status = status
      this.name = 'ApiError'
    }
  },
}))

vi.mock('@/app/(auth)/categories/category-form', () => ({
  CategoryForm: () => <div data-testid="category-form" />,
}))

vi.mock('@/app/(auth)/categories/category-delete-dialog', () => ({
  CategoryDeleteDialog: () => <div data-testid="category-delete-dialog" />,
}))

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Groceries',
    categoryType: 'expense',
    parentId: null,
    icon: null,
    color: '#22c55e',
    isSystem: false,
    isHidden: false,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Category
}

describe('CategoriesPageClient', () => {
  it('renders the page title', () => {
    render(<CategoriesPageClient initialCategories={[]} />)
    expect(screen.getByText('Categories')).toBeInTheDocument()
  })

  it('shows empty state when no categories', () => {
    render(<CategoriesPageClient initialCategories={[]} />)
    expect(screen.getByText('No categories yet')).toBeInTheDocument()
  })

  it('renders the Add Category button', () => {
    render(<CategoriesPageClient initialCategories={[]} />)
    expect(screen.getByText('Add Category')).toBeInTheDocument()
  })

  it('renders section headings when categories exist', () => {
    const categories = [
      makeCategory({ categoryType: 'expense', name: 'Groceries' }),
      makeCategory({ id: 'cat-2', categoryType: 'income', name: 'Salary' }),
    ]
    render(<CategoriesPageClient initialCategories={categories} />)
    expect(screen.getByText('Income Categories')).toBeInTheDocument()
    expect(screen.getByText('Expense Categories')).toBeInTheDocument()
  })

  it('renders category names', () => {
    const categories = [
      makeCategory({ name: 'Groceries' }),
      makeCategory({ id: 'cat-2', name: 'Transport', categoryType: 'expense' }),
    ]
    render(<CategoriesPageClient initialCategories={categories} />)
    expect(screen.getByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('Transport')).toBeInTheDocument()
  })

  it('shows System badge for system categories', () => {
    const categories = [makeCategory({ isSystem: true })]
    render(<CategoriesPageClient initialCategories={categories} />)
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('shows visibility status', () => {
    const categories = [
      makeCategory({ isHidden: false }),
      makeCategory({ id: 'cat-2', name: 'Hidden Cat', isHidden: true }),
    ]
    render(<CategoriesPageClient initialCategories={categories} />)
    expect(screen.getByText('Visible')).toBeInTheDocument()
    expect(screen.getByText('Hidden')).toBeInTheDocument()
  })
})
