import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelpPageClient } from '@/app/(auth)/help/help-page-client'
import type { FaqItem } from '@fin/core'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('HelpPageClient', () => {
  it('renders the page title', () => {
    render(<HelpPageClient faqItems={[]} />)
    expect(screen.getByText('Help & FAQ')).toBeInTheDocument()
  })

  it('renders default FAQs when DB returns empty', () => {
    render(<HelpPageClient faqItems={[]} />)
    expect(screen.getByText('What is Fin?')).toBeInTheDocument()
    expect(screen.getByText('How do I add a bank account?')).toBeInTheDocument()
  })

  it('renders category headings', () => {
    render(<HelpPageClient faqItems={[]} />)
    expect(screen.getByRole('heading', { name: 'General' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Budgets' })).toBeInTheDocument()
  })

  it('shows the All category badge', () => {
    render(<HelpPageClient faqItems={[]} />)
    expect(screen.getByText('All')).toBeInTheDocument()
  })

  it('filters by search text', async () => {
    const user = userEvent.setup()
    render(<HelpPageClient faqItems={[]} />)

    await user.type(screen.getByPlaceholderText('Search questions...'), 'bank account')

    expect(screen.getByText('How do I add a bank account?')).toBeInTheDocument()
    expect(screen.queryByText('What is Fin?')).not.toBeInTheDocument()
  })

  it('filters by category when clicking a badge', async () => {
    const user = userEvent.setup()
    render(<HelpPageClient faqItems={[]} />)

    // Both badge and heading show "Security & Privacy" — target the badge via data-slot
    const badges = screen.getAllByText('Security & Privacy')
    const badge = badges.find((el) => el.getAttribute('data-slot') === 'badge')
    expect(badge).toBeTruthy()
    await user.click(badge!)

    expect(screen.getByText('Is my financial data secure?')).toBeInTheDocument()
    expect(screen.queryByText('What is Fin?')).not.toBeInTheDocument()
  })

  it('shows empty state when search matches nothing', async () => {
    const user = userEvent.setup()
    render(<HelpPageClient faqItems={[]} />)

    await user.type(screen.getByPlaceholderText('Search questions...'), 'xyznonexistent')

    expect(screen.getByText('No questions match your search.')).toBeInTheDocument()
  })

  it('merges DB items with defaults (DB takes priority by slug)', () => {
    const dbItem: FaqItem = {
      id: 'db-1',
      userId: null,
      question: 'What is Fin? (Custom)',
      answer: 'Custom answer from DB',
      category: 'general',
      slug: 'what-is-fin',
      displayOrder: 0,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as FaqItem

    render(<HelpPageClient faqItems={[dbItem]} />)
    expect(screen.getByText('What is Fin? (Custom)')).toBeInTheDocument()
    expect(screen.queryByText('What is Fin?')).not.toBeInTheDocument()
  })
})
