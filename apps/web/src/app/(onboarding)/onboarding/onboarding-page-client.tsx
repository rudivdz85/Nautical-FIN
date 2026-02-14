'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createAccountSchema } from '@fin/core'
import type { Account } from '@fin/core'
import {
  Sparkles,
  Wallet,
  Landmark,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
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
import { apiClient, ApiError } from '@/lib/api-client'

const STEPS = ['Welcome', 'Profile', 'Account', 'Done']

const currencyOptions = [
  { value: 'ZAR', label: 'ZAR — South African Rand' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
]

const accountTypeOptions = [
  { value: 'cheque', label: 'Cheque / Current' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'investment', label: 'Investment' },
  { value: 'loan', label: 'Loan' },
  { value: 'other', label: 'Other' },
]

interface OnboardingPageClientProps {
  userName: string
}

export function OnboardingPageClient({ userName }: OnboardingPageClientProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [createdAccountName, setCreatedAccountName] = useState<string | null>(null)
  const [profileData, setProfileData] = useState({
    financialMonthStartDay: 25,
    defaultCurrency: 'ZAR',
  })

  const firstName = userName.split(' ')[0] ?? userName

  function goNext() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  return (
    <Card className="w-full max-w-lg">
      <CardContent className="pt-8 pb-6 px-8">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-8 bg-primary' : i < step ? 'w-2 bg-primary/60' : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <WelcomeStep firstName={firstName} onNext={goNext} />
        )}
        {step === 1 && (
          <ProfileStep
            profileData={profileData}
            setProfileData={setProfileData}
            saving={saving}
            setSaving={setSaving}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === 2 && (
          <AccountStep
            currency={profileData.defaultCurrency}
            saving={saving}
            setSaving={setSaving}
            onNext={(accountName) => {
              setCreatedAccountName(accountName)
              goNext()
            }}
            onSkip={goNext}
            onBack={goBack}
          />
        )}
        {step === 3 && (
          <DoneStep
            currency={profileData.defaultCurrency}
            salaryDay={profileData.financialMonthStartDay}
            accountName={createdAccountName}
            onFinish={() => router.push('/dashboard')}
          />
        )}
      </CardContent>
    </Card>
  )
}

function WelcomeStep({ firstName, onNext }: { firstName: string; onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="size-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Welcome to Fin, {firstName}</h1>
        <p className="text-muted-foreground">
          Let&apos;s set up your finances in a few quick steps.
        </p>
      </div>
      <Button size="lg" onClick={onNext} className="w-full">
        Get Started <ArrowRight className="ml-2 size-4" />
      </Button>
    </div>
  )
}

const profileFormSchema = z.object({
  financialMonthStartDay: z.number().int().min(1).max(28),
  defaultCurrency: z.string().length(3),
  isSalaried: z.enum(['yes', 'no']),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

function ProfileStep({
  profileData,
  setProfileData,
  saving,
  setSaving,
  onNext,
  onBack,
}: {
  profileData: { financialMonthStartDay: number; defaultCurrency: string }
  setProfileData: (data: { financialMonthStartDay: number; defaultCurrency: string }) => void
  saving: boolean
  setSaving: (v: boolean) => void
  onNext: () => void
  onBack: () => void
}) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      financialMonthStartDay: profileData.financialMonthStartDay,
      defaultCurrency: profileData.defaultCurrency,
      isSalaried: 'yes',
    },
  })

  async function onSubmit(data: ProfileFormValues) {
    setSaving(true)
    try {
      await apiClient.post('/api/users/complete-onboarding', {
        financialMonthStartDay: data.financialMonthStartDay,
        defaultCurrency: data.defaultCurrency,
        isSalaried: data.isSalaried === 'yes',
      })
      setProfileData({
        financialMonthStartDay: data.financialMonthStartDay,
        defaultCurrency: data.defaultCurrency,
      })
      onNext()
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to save profile')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Wallet className="size-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Your Financial Profile</h2>
        <p className="text-sm text-muted-foreground">
          Tell us a bit about your finances so we can personalise your experience.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="financialMonthStartDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>When does your financial month start?</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(parseInt(v, 10))}
                  defaultValue={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {day === 1
                          ? '1st of each month'
                          : day === 25
                            ? '25th (typical SA salary date)'
                            : `${day}${ordinalSuffix(day)} of each month`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="defaultCurrency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Currency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {currencyOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isSalaried"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Are you salaried?</FormLabel>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={field.value === 'yes' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => field.onChange('yes')}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={field.value === 'no' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => field.onChange('no')}
                  >
                    No
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 size-4" /> Back
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Continue'} {!saving && <ArrowRight className="ml-2 size-4" />}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

const accountFormSchema = createAccountSchema.pick({
  name: true,
  accountType: true,
  institution: true,
  currentBalance: true,
  balanceAsOfDate: true,
  currency: true,
})

type AccountFormValues = z.input<typeof accountFormSchema>

function AccountStep({
  currency,
  saving,
  setSaving,
  onNext,
  onSkip,
  onBack,
}: {
  currency: string
  saving: boolean
  setSaving: (v: boolean) => void
  onNext: (accountName: string) => void
  onSkip: () => void
  onBack: () => void
}) {
  const today = new Date().toISOString().split('T')[0] ?? ''

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: '',
      accountType: 'cheque',
      institution: '',
      currency,
      currentBalance: '0',
      balanceAsOfDate: today,
    },
  })

  async function onSubmit(data: AccountFormValues) {
    setSaving(true)
    try {
      await apiClient.post<Account>('/api/accounts', {
        ...data,
        isFirstAccount: true,
      })
      toast.success('Account created')
      onNext(data.name)
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to create account')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Landmark className="size-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Add Your First Account</h2>
        <p className="text-sm text-muted-foreground">
          Connect your main bank account to start tracking.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. FNB Cheque Account" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accountTypeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="institution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. FNB" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="currentBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Balance</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} value={field.value ?? '0'} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="balanceAsOfDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Balance As Of</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 size-4" /> Back
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Creating...' : 'Continue'} {!saving && <ArrowRight className="ml-2 size-4" />}
            </Button>
          </div>

          <button
            type="button"
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={onSkip}
          >
            Skip for now — I&apos;ll add accounts later
          </button>
        </form>
      </Form>
    </div>
  )
}

function DoneStep({
  currency,
  salaryDay,
  accountName,
  onFinish,
}: {
  currency: string
  salaryDay: number
  accountName: string | null
  onFinish: () => void
}) {
  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <CheckCircle2 className="size-8 text-emerald-600" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">You&apos;re all set!</h2>
        <p className="text-muted-foreground">
          Your finances are ready to track.
        </p>
      </div>

      <div className="w-full rounded-lg border p-4 text-left space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Currency</span>
          <span className="font-medium">{currency}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Financial month starts</span>
          <span className="font-medium">{salaryDay}{ordinalSuffix(salaryDay)}</span>
        </div>
        {accountName && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">First account</span>
            <span className="font-medium">{accountName}</span>
          </div>
        )}
      </div>

      <Button size="lg" onClick={onFinish} className="w-full">
        Go to Dashboard <ArrowRight className="ml-2 size-4" />
      </Button>
    </div>
  )
}

function ordinalSuffix(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'st'
  if (mod10 === 2 && mod100 !== 12) return 'nd'
  if (mod10 === 3 && mod100 !== 13) return 'rd'
  return 'th'
}
