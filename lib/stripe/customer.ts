import { stripe } from './index'
import { createClient } from '@/lib/supabase/server'

/**
 * Get or create a Stripe customer for a workspace
 * Returns the Stripe customer ID
 */
export async function getOrCreateStripeCustomer(
  workspaceId: string,
  userId: string
): Promise<{ customerId: string; isNew: boolean } | { error: string }> {
  const supabase = await createClient()

  // Get workspace with current stripe_customer_id
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('stripe_customer_id, name')
    .eq('id', workspaceId)
    .single()

  if (workspaceError || !workspace) {
    return { error: 'Workspace not found' }
  }

  // If workspace already has a Stripe customer, return it
  if (workspace.stripe_customer_id) {
    return { customerId: workspace.stripe_customer_id, isNew: false }
  }

  // Get user profile for customer metadata
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single()

  if (!profile?.email) {
    return { error: 'User email not found' }
  }

  try {
    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: profile.email,
      name: profile.full_name || undefined,
      metadata: {
        workspaceId,
        userId,
        workspaceName: workspace.name,
      },
    })

    // Update workspace with Stripe customer ID
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ stripe_customer_id: customer.id })
      .eq('id', workspaceId)

    if (updateError) {
      console.error('Failed to update workspace with Stripe customer ID:', updateError)
      // Don't fail - customer was created successfully
    }

    return { customerId: customer.id, isNew: true }
  } catch (error) {
    console.error('Failed to create Stripe customer:', error)
    return { error: 'Failed to create Stripe customer' }
  }
}

