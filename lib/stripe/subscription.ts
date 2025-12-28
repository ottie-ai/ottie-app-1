import { stripe, getPriceId, type PlanId, type BillingPeriod } from './index'
import { createClient } from '@/lib/supabase/server'

interface UpdateSubscriptionParams {
  workspaceId: string
  userId: string
  newPlanId: PlanId
  billingPeriod: BillingPeriod
}

/**
 * Upgrade or downgrade an existing subscription with proration
 */
export async function updateSubscription({
  workspaceId,
  userId,
  newPlanId,
  billingPeriod,
}: UpdateSubscriptionParams): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  // Get workspace with subscription info
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('id', workspaceId)
    .single()

  if (workspaceError || !workspace) {
    return { error: 'Workspace not found' }
  }

  if (!workspace.stripe_subscription_id) {
    return { error: 'No active subscription found' }
  }

  const newPriceId = getPriceId(newPlanId, billingPeriod)

  try {
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(workspace.stripe_subscription_id)

    if (!subscription.items.data[0]) {
      return { error: 'Subscription has no items' }
    }

    // Update subscription with proration
    await stripe.subscriptions.update(workspace.stripe_subscription_id, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
      metadata: {
        workspaceId,
        planId: newPlanId,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to update subscription:', error)
    return { error: 'Failed to update subscription' }
  }
}

/**
 * Create a Customer Portal session for subscription management
 */
export async function createPortalSession(
  workspaceId: string
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()

  // Get workspace with Stripe customer ID
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('stripe_customer_id')
    .eq('id', workspaceId)
    .single()

  if (workspaceError || !workspace) {
    return { error: 'Workspace not found' }
  }

  if (!workspace.stripe_customer_id) {
    return { error: 'No Stripe customer found' }
  }

  // Get app origin for return URL
  const getAppOrigin = () => {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ottie.com'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const port = process.env.NODE_ENV === 'production' ? '' : ':3000'
    
    if (process.env.NODE_ENV === 'production') {
      return `${protocol}://app.${rootDomain}`
    }
    return `${protocol}://app.localhost${port}`
  }

  const appOrigin = getAppOrigin()

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: workspace.stripe_customer_id,
      return_url: `${appOrigin}/settings`,
    })

    return { url: session.url }
  } catch (error) {
    console.error('Failed to create portal session:', error)
    return { error: 'Failed to create portal session' }
  }
}

