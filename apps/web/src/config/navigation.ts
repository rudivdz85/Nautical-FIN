import {
  LayoutDashboard,
  CalendarCheck,
  ArrowLeftRight,
  Wallet,
  ClipboardCheck,
  MessageSquare,
  Landmark,
  Repeat,
  PiggyBank,
  CreditCard,
  Tags,
  Upload,
  HelpCircle,
  Settings,
  Banknote,
  ListTodo,
} from 'lucide-react'

export const primaryNav = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Daily Tracker', href: '/tracker', icon: CalendarCheck },
  { title: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { title: 'Budget', href: '/budget', icon: Wallet },
  { title: 'Actuals', href: '/actuals', icon: ClipboardCheck },
  { title: 'Chat', href: '/chat', icon: MessageSquare },
]

export const secondaryNav = [
  { title: 'Accounts', href: '/accounts', icon: Landmark },
  { title: 'Incomes', href: '/incomes', icon: Banknote },
  { title: 'Categories', href: '/categories', icon: Tags },
  { title: 'Recurring', href: '/recurring', icon: Repeat },
  { title: 'Savings Goals', href: '/savings', icon: PiggyBank },
  { title: 'Debts', href: '/debts', icon: CreditCard },
  { title: 'Tasks', href: '/tasks', icon: ListTodo },
  { title: 'Import', href: '/import', icon: Upload },
  { title: 'Help', href: '/help', icon: HelpCircle },
  { title: 'Settings', href: '/settings', icon: Settings },
]
