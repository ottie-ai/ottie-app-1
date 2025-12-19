/**
 * Image Delete API Route
 * DELETE /api/delete-image - Delete image from Storage with access validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Validate that user has edit access to the site
 */
async function validateSiteAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  siteId: string
): Promise<{ hasAccess: boolean; error?: string }> {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(siteId)) {
    return { hasAccess: false, error: 'Invalid site ID format' }
  }

  // Query site with membership check
  const { data: site, error } = await supabase
    .from('sites')
    .select(`
      id,
      workspace_id,
      creator_id,
      assigned_agent_id,
      deleted_at,
      workspace:workspaces!inner (
        memberships!inner (
          user_id,
          role
        )
      )
    `)
    .eq('id', siteId)
    .is('deleted_at', null)
    .single()

  if (error || !site) {
    return { hasAccess: false, error: 'Site not found' }
  }

  // Find user's membership
  const workspace = site.workspace as any
  const memberships = workspace?.memberships || []
  const userMembership = memberships.find((m: any) => m.user_id === userId)

  if (!userMembership) {
    return { hasAccess: false, error: 'Not a member of this workspace' }
  }

  // Check role-based access
  const { role } = userMembership as { role: string }

  // Owner and admin can access any site in workspace
  if (role === 'owner' || role === 'admin') {
    return { hasAccess: true }
  }

  // Agent can only access sites they created or are assigned to
  if (role === 'agent') {
    if (site.creator_id === userId || site.assigned_agent_id === userId) {
      return { hasAccess: true }
    }
    return { hasAccess: false, error: 'You are not assigned to this site' }
  }

  return { hasAccess: false, error: 'Insufficient permissions' }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limiting: 20 deletes per minute
    const { rateLimit, RateLimitPresets } = await import('@/lib/rate-limit')
    const rateLimitResult = rateLimit(user.id, RateLimitPresets.DELETE)
    
    if (!rateLimitResult.success) {
      const resetIn = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
      return NextResponse.json(
        { 
          success: false, 
          error: `Too many delete requests. Please wait ${resetIn} seconds and try again.` 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RateLimitPresets.DELETE.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.reset),
          }
        }
      )
    }

    // Parse request body
    const body = await request.json()
    const { filePath, siteId } = body

    if (!filePath || !siteId) {
      return NextResponse.json(
        { success: false, error: 'Missing filePath or siteId' },
        { status: 400 }
      )
    }

    // Validate path starts with site ID
    if (!filePath.startsWith(`${siteId}/`)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 }
      )
    }

    // Validate user has access to the site
    const accessCheck = await validateSiteAccess(supabase, user.id, siteId)
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { success: false, error: accessCheck.error || 'Access denied' },
        { status: 403 }
      )
    }

    // Delete from Storage using admin client (bypasses RLS after validation)
    console.log('[DELETE API] Attempting to delete:', { filePath, siteId, userId: user.id })
    
    const adminClient = createAdminClient()
    
    // First, check if file exists
    const { data: listData, error: listError } = await adminClient.storage
      .from('site-images')
      .list(filePath.split('/')[0], {
        search: filePath.split('/')[1]
      })
    
    console.log('[DELETE API] File check:', { 
      listData, 
      listError,
      folder: filePath.split('/')[0],
      filename: filePath.split('/')[1]
    })
    
    const { data, error } = await adminClient.storage
      .from('site-images')
      .remove([filePath])

    console.log('[DELETE API] Storage response:', { 
      data, 
      error, 
      filePath,
      dataLength: data?.length,
      errorMessage: error?.message,
    })

    if (error) {
      console.error('[DELETE API] Error deleting image:', {
        error,
        message: error.message,
        filePath
      })
      return NextResponse.json(
        { success: false, error: `Failed to delete: ${error.message}` },
        { status: 500 }
      )
    }

    // Check if file was actually deleted
    if (!data || data.length === 0) {
      console.warn('[DELETE API] No files deleted:', { filePath, data })
      return NextResponse.json(
        { success: false, error: 'File not found or already deleted' },
        { status: 404 }
      )
    }

    console.log('[DELETE API] Image deleted successfully:', { filePath, deleted: data })

    return NextResponse.json({ 
      success: true,
      deleted: data || []
    })
  } catch (error) {
    console.error('Delete API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Delete failed' 
      },
      { status: 500 }
    )
  }
}

