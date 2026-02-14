'use client'

import { useState } from 'react'
import type { FaqItem } from '@fin/core'
import { Search, ChevronDown, HelpCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  budgets: 'Budgets',
  actuals: 'Monthly Actuals',
  'daily-tracker': 'Daily Tracker',
  subscriptions: 'Subscriptions',
  security: 'Security & Privacy',
  'bank-sync': 'Bank Sync',
}

const CATEGORY_ORDER = [
  'general',
  'budgets',
  'actuals',
  'daily-tracker',
  'subscriptions',
  'security',
  'bank-sync',
]

interface DefaultFaq {
  question: string
  answer: string
  category: string
  slug: string
}

const DEFAULT_FAQS: DefaultFaq[] = [
  {
    question: 'What is Fin?',
    answer:
      'Fin is a personal finance app designed to help you track spending, manage budgets, and reach your savings goals. It follows a South African salary-cycle approach where your financial month starts on your payday.',
    category: 'general',
    slug: 'what-is-fin',
  },
  {
    question: 'How do I add a bank account?',
    answer:
      'Go to Accounts in the sidebar, click "Add Account", and fill in your account name, type, institution, and current balance. You can add cheque, savings, credit card, investment, and loan accounts.',
    category: 'general',
    slug: 'add-bank-account',
  },
  {
    question: 'How do I import bank statements?',
    answer:
      'Go to Import in the sidebar. Select the account, upload a CSV file from your bank, map the columns (date, description, amount), review the transactions, and click Process. The system will automatically categorise transactions where possible.',
    category: 'general',
    slug: 'import-statements',
  },
  {
    question: 'What is the difference between a Budget and Actuals?',
    answer:
      'A Budget is your plan for the month — how much you expect to earn and how you plan to allocate it across categories. Actuals track what really happened: your real income, real spending, and how it compared to the plan. Think of Budget as the forecast and Actuals as the reality.',
    category: 'budgets',
    slug: 'budget-vs-actuals',
  },
  {
    question: 'How do I create a monthly budget?',
    answer:
      'Go to Budget in the sidebar and click "Create Budget". Select the month and year, add your expected income sources, then allocate amounts to expense categories. The budget will show your unallocated amount so you can ensure every rand is accounted for.',
    category: 'budgets',
    slug: 'create-budget',
  },
  {
    question: 'What does "unallocated amount" mean?',
    answer:
      'The unallocated amount is the difference between your total planned income and total planned expenses. Ideally this should be zero, meaning every rand of income has been assigned to a category (including savings). A positive unallocated amount means you have income not yet assigned to any category.',
    category: 'budgets',
    slug: 'unallocated-amount',
  },
  {
    question: 'How do Monthly Actuals work?',
    answer:
      'Each month, an Actuals period tracks your real income and expenses against your budget. You can add actual category spending, confirm balances, and reconcile at month end. The system compares actual vs planned amounts to show where you over- or under-spent.',
    category: 'actuals',
    slug: 'how-actuals-work',
  },
  {
    question: 'What is balance confirmation?',
    answer:
      'Balance confirmation is when you verify that an account\'s balance in Fin matches the real balance in your bank. This helps catch any missing or duplicate transactions and keeps your records accurate.',
    category: 'actuals',
    slug: 'balance-confirmation',
  },
  {
    question: 'How does the Daily Tracker work?',
    answer:
      'The Daily Tracker lets you log individual transactions as they happen throughout the day. Select the date, add transactions with descriptions, amounts, and categories, and the app tracks your daily spending against your budget. It helps you stay mindful of spending in real time.',
    category: 'daily-tracker',
    slug: 'daily-tracker-overview',
  },
  {
    question: 'Can I edit or delete a daily transaction?',
    answer:
      'Yes. On the Daily Tracker page, find the transaction you want to modify and use the actions menu to edit its details or delete it entirely.',
    category: 'daily-tracker',
    slug: 'edit-daily-transaction',
  },
  {
    question: 'What subscription tiers are available?',
    answer:
      'Fin starts with a free 14-day trial that includes all features. After the trial, subscription tiers will be available with different feature levels. Details on pricing will be announced before the trial period ends.',
    category: 'subscriptions',
    slug: 'subscription-tiers',
  },
  {
    question: 'What happens when my trial expires?',
    answer:
      'When your 14-day trial ends, you will need to select a subscription plan to continue using Fin. Your data is always preserved regardless of subscription status.',
    category: 'subscriptions',
    slug: 'trial-expiry',
  },
  {
    question: 'Is my financial data secure?',
    answer:
      'Yes. Fin uses industry-standard security practices: all data is encrypted in transit (HTTPS), stored in a secure PostgreSQL database, and access is controlled through Clerk authentication. We never store your bank login credentials.',
    category: 'security',
    slug: 'data-security',
  },
  {
    question: 'Who can see my financial data?',
    answer:
      'Only you. Your financial data is tied to your user account and is never shared with other users. API access requires authentication, and all data queries are scoped to your user ID.',
    category: 'security',
    slug: 'data-privacy',
  },
  {
    question: 'Can I delete my account and data?',
    answer:
      'Yes. You can request full account deletion through Settings. This will permanently remove all your financial data, accounts, transactions, budgets, and personal information from our systems.',
    category: 'security',
    slug: 'delete-account',
  },
  {
    question: 'Does Fin connect directly to my bank?',
    answer:
      'Not yet. Currently, Fin uses CSV statement imports to bring in your bank transactions. Direct bank sync via open banking APIs is planned for a future release.',
    category: 'bank-sync',
    slug: 'bank-sync-status',
  },
  {
    question: 'Which banks are supported for statement import?',
    answer:
      'Fin supports CSV files from any bank. During import, you map the columns (date, description, amount) to match your bank\'s format. This means it works with any South African or international bank that offers CSV statement downloads.',
    category: 'bank-sync',
    slug: 'supported-banks',
  },
]

interface HelpPageClientProps {
  faqItems: FaqItem[]
}

export function HelpPageClient({ faqItems }: HelpPageClientProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  // Merge DB items with defaults (DB items take priority by slug)
  const dbSlugs = new Set(faqItems.map((item) => item.slug))
  const merged = [
    ...faqItems.map((item) => ({
      question: item.question,
      answer: item.answer,
      category: item.category,
      slug: item.slug,
    })),
    ...DEFAULT_FAQS.filter((faq) => !dbSlugs.has(faq.slug)),
  ]

  // Filter by category and search
  const filtered = merged.filter((faq) => {
    if (activeCategory !== 'all' && faq.category !== activeCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Group by category
  const grouped = CATEGORY_ORDER.reduce<Record<string, typeof filtered>>(
    (acc, cat) => {
      const items = filtered.filter((faq) => faq.category === cat)
      if (items.length > 0) {
        acc[cat] = items
      }
      return acc
    },
    {},
  )

  const categories = CATEGORY_ORDER.filter(
    (cat) => merged.some((faq) => faq.category === cat),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Help & FAQ</h1>
        <p className="text-sm text-muted-foreground">
          Find answers to common questions about using Fin.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={activeCategory === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setActiveCategory('all')}
        >
          All
        </Badge>
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setActiveCategory(cat)}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </Badge>
        ))}
      </div>

      {/* FAQ sections */}
      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <HelpCircle className="size-10 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              {search ? 'No questions match your search.' : 'No FAQ items yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <h2 className="text-lg font-semibold">{CATEGORY_LABELS[category] ?? category}</h2>
              <Card>
                <CardContent className="divide-y p-0">
                  {items.map((faq) => (
                    <FaqCollapsible
                      key={faq.slug}
                      question={faq.question}
                      answer={faq.answer}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FaqCollapsible({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors">
        <span className="text-sm font-medium pr-4">{question}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed">
          {answer}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
