import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'

export const metadata: Metadata = {
  title: 'Fin - Personal Finance Management',
  description: 'AI-powered personal finance management made simple',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const content = (
    <html lang="en">
      <body>{children}</body>
    </html>
  )

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return content
  }

  return <ClerkProvider>{content}</ClerkProvider>
}
