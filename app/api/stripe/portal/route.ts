import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPortalSession } from '@/lib/stripe/subscription'

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
    const { workspaceId } = body as { workspaceId: string }

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing workspace ID' },
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

    // Create portal session
    const result = await createPortalSession(workspaceId)

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: result.url })
  } catch (error) {
    console.error('Portal API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

