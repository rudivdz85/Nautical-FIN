'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import type { User } from '@fin/core'
import { toast } from 'sonner'
import { Moon, Sun, Monitor, User as UserIcon, Wallet, Bell, Palette } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { apiClient, ApiError } from '@/lib/api-client'

interface SettingsPageClientProps {
  initialUser: User
}

type ThemeValue = 'light' | 'dark' | 'system'

const CURRENCIES = [
  { value: 'ZAR', label: 'ZAR — South African Rand' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
]

const REDISTRIBUTION_OPTIONS = [
  { value: 'even', label: 'Even', description: 'Distribute equally across remaining days' },
  { value: 'weekly', label: 'Weekly', description: 'Distribute in weekly chunks' },
  { value: 'weighted', label: 'Weighted', description: 'Larger allocation for upcoming days' },
]

export function SettingsPageClient({ initialUser }: SettingsPageClientProps) {
  const { setTheme } = useTheme()
  const [user, setUser] = useState(initialUser)
  const prefs = user.preferences ?? {
    financialMonthStartDay: 25,
    defaultCurrency: 'ZAR',
    theme: 'system' as const,
    budgetRedistribution: 'even' as const,
    notifications: { inApp: true, push: true, desktop: true, email: false },
  }

  async function updatePreferences(patch: Record<string, unknown>) {
    try {
      const updated = await apiClient.patch<User>('/api/users/me/preferences', patch)
      setUser(updated)
      toast.success('Preferences updated')
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to update preferences')
      }
    }
  }

  async function updateProfile(patch: Record<string, unknown>) {
    try {
      const updated = await apiClient.patch<User>('/api/users/me', patch)
      setUser(updated)
      toast.success('Profile updated')
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to update profile')
      }
    }
  }

  function handleThemeChange(value: ThemeValue) {
    setTheme(value)
    updatePreferences({ theme: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your account and preferences.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="size-5 text-muted-foreground" />
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account information managed by Clerk.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Display Name</Label>
              <p className="mt-1 text-sm font-medium">{user.displayName ?? '—'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="mt-1 text-sm font-medium">{user.email}</p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Salaried</Label>
              <p className="text-xs text-muted-foreground">Do you receive a regular salary?</p>
            </div>
            <Switch
              checked={user.isSalaried ?? false}
              onCheckedChange={(checked) => updateProfile({ isSalaried: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Financial Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="size-5 text-muted-foreground" />
            <div>
              <CardTitle>Financial Preferences</CardTitle>
              <CardDescription>Configure how your finances are tracked and calculated.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Financial Month Start Day</Label>
              <Select
                value={String(prefs.financialMonthStartDay)}
                onValueChange={(v) =>
                  updatePreferences({ financialMonthStartDay: parseInt(v, 10) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {day === 1 ? '1st' : day === 25 ? '25th (default)' : String(day)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The day your financial month starts (e.g. salary day).
              </p>
            </div>

            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select
                value={prefs.defaultCurrency}
                onValueChange={(v) => updatePreferences({ defaultCurrency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Budget Redistribution Strategy</Label>
            <Select
              value={prefs.budgetRedistribution}
              onValueChange={(v) => updatePreferences({ budgetRedistribution: v })}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REDISTRIBUTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How unspent daily budget is redistributed across remaining days.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="size-5 text-muted-foreground" />
            <div>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex gap-2">
              {([
                { value: 'light' as const, label: 'Light', icon: Sun },
                { value: 'dark' as const, label: 'Dark', icon: Moon },
                { value: 'system' as const, label: 'System', icon: Monitor },
              ]).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleThemeChange(value)}
                  className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors ${
                    prefs.theme === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-muted-foreground" />
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose how you want to be notified.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {([
            { key: 'inApp' as const, label: 'In-App Notifications', description: 'Show notifications within the app' },
            { key: 'push' as const, label: 'Push Notifications', description: 'Receive push notifications on your device' },
            { key: 'desktop' as const, label: 'Desktop Notifications', description: 'Show desktop notifications when the app is open' },
            { key: 'email' as const, label: 'Email Notifications', description: 'Receive notification emails' },
          ]).map(({ key, label, description }, index) => (
            <div key={key}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="flex items-center justify-between">
                <div>
                  <Label>{label}</Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch
                  checked={prefs.notifications[key]}
                  onCheckedChange={(checked) =>
                    updatePreferences({
                      notifications: { ...prefs.notifications, [key]: checked },
                    })
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
