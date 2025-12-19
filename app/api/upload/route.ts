/**
 * Image Upload API Route
 * POST /api/upload - Upload and process images with Sharp.js
 * 
 * SECURITY: Requires siteId and validates user has edit access (owner/admin/assigned)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processImage, validateImage } from '@/lib/image'
import { getPublicUrl, SITE_IMAGES_BUCKET } from '@/lib/supabase/storage'
import { generateSecureFilename } from '@/lib/storage/security'
import type { ImageUploadResponse, ImageUploadResult } from '@/types/image'

const MAX_FILES = 10
const MAX_TOTAL_SIZE = 100 * 1024 * 1024 // 100MB total (will be optimized to ~5MB per file by Sharp.js)

/**
 * Validate that user has edit access to the site
 * Returns true if user is owner, admin, or assigned agent
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

    // Rate limiting: 10 uploads per minute
    const { rateLimit, RateLimitPresets } = await import('@/lib/rate-limit')
    const rateLimitResult = rateLimit(user.id, RateLimitPresets.UPLOAD)
    
    if (!rateLimitResult.success) {
      const resetIn = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
      return NextResponse.json(
        { 
          success: false, 
          error: `Too many uploads. Please wait ${resetIn} seconds and try again.` 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RateLimitPresets.UPLOAD.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.reset),
          }
        }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('images') as File[]
    const siteId = formData.get('siteId') as string | null

    // Validate siteId is provided
    if (!siteId) {
      return NextResponse.json(
        { success: false, error: 'Site ID is required' },
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

    // Validate file count
    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No images provided' },
        { status: 400 }
      )
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      )
    }

    // Validate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Total size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit (will be optimized to ~5MB per file)` 
        },
        { status: 400 }
      )
    }

    // Process each image
    const results: ImageUploadResult[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Validate image
        const validation = await validateImage(buffer)
        if (!validation.valid) {
          errors.push(`${file.name}: ${validation.error}`)
          continue
        }

        // Process image with Sharp (will iteratively reduce quality if needed to meet 5MB limit)
        const processed = await processImage(buffer, {
          maxWidth: 1920,
          quality: 80,
          format: 'webp',
        })

        // Generate secure filename and path to site folder
        const filename = generateSecureFilename('webp')
        const path = `${siteId}/${filename}`

        // Upload to Supabase Storage using admin client (service role)
        // Access is validated above - admin client bypasses RLS
        const adminClient = createAdminClient()
        const { data, error } = await adminClient.storage
          .from(SITE_IMAGES_BUCKET)
          .upload(path, processed.buffer, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: true, // Allow overwriting - Supabase will add suffix if needed
          })

        if (error) {
          console.error('Upload error:', error)
          errors.push(`${file.name}: Upload failed`)
          continue
        }

        // Get public URL
        const publicUrl = getPublicUrl(SITE_IMAGES_BUCKET, path)

        results.push({
          url: publicUrl,
          path,
          width: processed.width,
          height: processed.height,
          size: processed.size,
          format: processed.format,
        })
      } catch (error) {
        console.error('Processing error:', error)
        errors.push(
          `${file.name}: ${error instanceof Error ? error.message : 'Processing failed'}`
        )
      }
    }

    // Return results
    if (results.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to process all images: ${errors.join(', ')}` 
        },
        { status: 400 }
      )
    }

    const response: ImageUploadResponse = {
      success: true,
      images: results,
    }

    // Include errors if some files failed
    if (errors.length > 0) {
      response.error = `Some files failed: ${errors.join(', ')}`
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      },
      { status: 500 }
    )
  }
}
