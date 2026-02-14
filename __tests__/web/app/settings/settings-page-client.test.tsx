import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SettingsPageClient } from '@/app/(auth)/settings/settings-page-client'
import type { User } from '@fin/core'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ setTheme: vi.fn(), theme: 'system' }),
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

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    clerkId: 'clerk_123',
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    onboardingCompleted: true,
    isSalaried: true,
    preferences: {
      financialMonthStartDay: 25,
      defaultCurrency: 'ZAR',
      theme: 'system',
      budgetRedistribution: 'even',
      notifications: { inApp: true, push: true, desktop: true, email: false },
    },
    ...overrides,
  } as User
}

describe('SettingsPageClient', () => {
  it('renders the page title', () => {
    render(<SettingsPageClient initialUser={makeUser()} />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders profile section with user info', () => {
    render(<SettingsPageClient initialUser={makeUser({ displayName: 'John Doe', email: 'john@test.com' })} />)
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@test.com')).toBeInTheDocument()
  })

  it('renders Financial Preferences section', () => {
    render(<SettingsPageClient initialUser={makeUser()} />)
    expect(screen.getByText('Financial Preferences')).toBeInTheDocument()
    expect(screen.getByText('Financial Month Start Day')).toBeInTheDocument()
    expect(screen.getByText('Default Currency')).toBeInTheDocument()
  })

  it('renders Appearance section', () => {
    render(<SettingsPageClient initialUser={makeUser()} />)
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('renders Notifications section', () => {
    render(<SettingsPageClient initialUser={makeUser()} />)
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('In-App Notifications')).toBeInTheDocument()
    expect(screen.getByText('Push Notifications')).toBeInTheDocument()
    expect(screen.getByText('Desktop Notifications')).toBeInTheDocument()
    expect(screen.getByText('Email Notifications')).toBeInTheDocument()
  })

  it('renders salaried toggle', () => {
    render(<SettingsPageClient initialUser={makeUser()} />)
    expect(screen.getByText('Salaried')).toBeInTheDocument()
  })

  it('renders budget redistribution option', () => {
    render(<SettingsPageClient initialUser={makeUser()} />)
    expect(screen.getByText('Budget Redistribution Strategy')).toBeInTheDocument()
  })
})
