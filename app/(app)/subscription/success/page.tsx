import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

async function SuccessContent() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Subscription Successful!</h1>
          <p className="text-muted-foreground">
            Your subscription has been activated. You now have access to all premium features.
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/sites">
              Go to Sites
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full">
            <Link href="/settings">
              View Settings
            </Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          You will receive a confirmation email shortly with your receipt.
        </p>
      </div>
    </div>
  )
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}

