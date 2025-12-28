import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe/checkout'
import type { PlanId, BillingPeriod } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { planId, billingPeriod, workspaceId } = body as {
      planId: PlanId
      billingPeriod: BillingPeriod
      workspaceId: string
    }

    // Validate input
    if (!planId || !billingPeriod || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['starter', 'growth', 'agency'].includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      )
    }

    if (!['monthly', 'annual'].includes(billingPeriod)) {
      return NextResponse.json(
        { error: 'Invalid billing period' },
        { status: 400 }
      )
    }

    // Verify user has access to workspace
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      )
    }

    // Only owner can manage subscription
    if (membership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only workspace owner can manage subscription' },
        { status: 403 }
      )
    }

    // Check if trial has been used
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('trial_used_at, stripe_customer_id')
      .eq('id', workspaceId)
      .single()

    const hasUsedTrial = !!(workspace?.trial_used_at || workspace?.stripe_customer_id)

    // Create checkout session
    const result = await createCheckoutSession({
      workspaceId,
      userId: user.id,
      planId,
      billingPeriod,
      hasUsedTrial,
    })

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: result.url })
  } catch (error) {
    console.error('Checkout API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

