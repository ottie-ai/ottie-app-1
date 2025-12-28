import Stripe from 'stripe'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Use service role for webhook handlers (bypass RLS)
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Handle checkout.session.completed event
 * Activates subscription after successful checkout
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const workspaceId = session.metadata?.workspaceId
  const planId = session.metadata?.planId

  if (!workspaceId || !planId) {
    console.error('Missing metadata in checkout session:', session.id)
    return
  }

  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  // Update workspace with subscription info
  const { error } = await supabaseAdmin
    .from('workspaces')
    .update({
      plan: planId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
    })
    .eq('id', workspaceId)

  if (error) {
    console.error('Failed to update workspace after checkout:', error)
  }

  console.log(`✅ Checkout completed for workspace ${workspaceId}, plan: ${planId}`)
}

/**
 * Handle customer.subscription.updated event
 * Updates workspace when subscription changes
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  const workspaceId = subscription.metadata?.workspaceId
  const planId = subscription.metadata?.planId

  if (!workspaceId) {
    console.error('Missing workspaceId in subscription metadata:', subscription.id)
    return
  }

  const priceId = subscription.items.data[0]?.price.id

  // Get current period end - it may be on billing_cycle_anchor or current_period_end
  const periodEnd = (subscription as any).current_period_end || (subscription as any).billing_cycle_anchor
  
  const { error } = await supabaseAdmin
    .from('workspaces')
    .update({
      ...(planId && { plan: planId }),
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      subscription_status: subscription.status as any,
      ...(periodEnd && { subscription_period_end: new Date(periodEnd * 1000).toISOString() }),
      cancel_at_period_end: (subscription as any).cancel_at_period_end || false,
    })
    .eq('id', workspaceId)

  if (error) {
    console.error('Failed to update workspace subscription:', error)
  }

  console.log(`✅ Subscription updated for workspace ${workspaceId}, status: ${subscription.status}`)
}

/**
 * Handle customer.subscription.deleted event
 * Marks subscription as canceled
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  const workspaceId = subscription.metadata?.workspaceId

  if (!workspaceId) {
    console.error('Missing workspaceId in subscription metadata:', subscription.id)
    return
  }

  const { error } = await supabaseAdmin
    .from('workspaces')
    .update({
      plan: 'free',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      stripe_price_id: null,
    })
    .eq('id', workspaceId)

  if (error) {
    console.error('Failed to update workspace after subscription deletion:', error)
  }

  console.log(`✅ Subscription deleted for workspace ${workspaceId}`)
}

/**
 * Handle invoice.payment_succeeded event
 * Confirms successful payment
 */
export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
) {
  // Type cast to access subscription property (API version compatibility)
  const subscriptionId = (invoice as any).subscription as string
  
  if (!subscriptionId) {
    return // Not a subscription invoice
  }

  // Get subscription to find workspace
  const subscription = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (subscription.data) {
    const { error } = await supabaseAdmin
      .from('workspaces')
      .update({
        subscription_status: 'active',
        grace_period_ends_at: null,
      })
      .eq('id', subscription.data.id)

    if (error) {
      console.error('Failed to update workspace after payment success:', error)
    }

    console.log(`✅ Payment succeeded for subscription ${subscriptionId}`)
  }
}

/**
 * Handle invoice.payment_failed event
 * Starts grace period
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
) {
  // Type cast to access subscription property (API version compatibility)
  const subscriptionId = (invoice as any).subscription as string
  
  if (!subscriptionId) {
    return // Not a subscription invoice
  }

  // Get subscription to find workspace
  const subscription = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (subscription.data) {
    // Set grace period (14 days from now)
    const gracePeriodEnd = new Date()
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 14)

    const { error } = await supabaseAdmin
      .from('workspaces')
      .update({
        subscription_status: 'past_due',
        grace_period_ends_at: gracePeriodEnd.toISOString(),
      })
      .eq('id', subscription.data.id)

    if (error) {
      console.error('Failed to update workspace after payment failure:', error)
    }

    console.log(`⚠️ Payment failed for subscription ${subscriptionId}, grace period set`)
  }
}

/**
 * Handle invoice.upcoming event
 * Send renewal reminders
 */
export async function handleInvoiceUpcoming(
  invoice: Stripe.Invoice
) {
  const daysUntilRenewal = Math.ceil(
    (invoice.period_end! * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
  )

  // Only send reminders at specific intervals
  if (![30, 7, 1].includes(daysUntilRenewal)) {
    return
  }

  // TODO: Implement email reminder
  console.log(`📧 Renewal reminder needed: ${daysUntilRenewal} days until renewal`)
  console.log(`   Customer: ${invoice.customer}`)
  console.log(`   Amount: $${(invoice.amount_due / 100).toFixed(2)}`)
}

