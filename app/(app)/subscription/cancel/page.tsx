import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

async function CancelContent() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-orange-100 dark:bg-orange-900/20 p-3">
            <XCircle className="h-12 w-12 text-orange-600 dark:text-orange-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Subscription Cancelled</h1>
          <p className="text-muted-foreground">
            Your subscription process was cancelled. No charges were made to your account.
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/sites">
              Return to Sites
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full">
            <Link href="/settings">
              Try Again
            </Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          If you have any questions, please contact our support team.
        </p>
      </div>
    </div>
  )
}

export default function SubscriptionCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <CancelContent />
    </Suspense>
  )
}

