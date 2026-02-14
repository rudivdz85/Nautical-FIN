'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <AlertTriangle className="size-12 text-destructive" />
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        There was an error loading this page. This might be a temporary issue.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
          Go to Dashboard
        </Button>
        <Button onClick={reset}>
          Try Again
        </Button>
      </div>
    </div>
  )
}
