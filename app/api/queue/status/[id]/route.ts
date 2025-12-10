/**
 * Queue Status API Endpoint
 * Get status of a specific scrape job
 * Used by frontend to poll job status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getJobPosition, isJobProcessing } from '@/lib/queue/scrape-queue'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET /api/queue/status/[id]
 * Get status of a scrape job by preview_id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const previewId = params.id
    
    if (!previewId) {
      return NextResponse.json({
        success: false,
        message: 'Preview ID is required',
      }, { status: 400 })
    }
    
    // Get preview from database
    const supabase = await createClient()
    const { data: preview, error: dbError } = await supabase
      .from('temp_previews')
      .select('id, status, error_message, created_at')
      .eq('id', previewId)
      .single()
    
    if (dbError || !preview) {
      return NextResponse.json({
        success: false,
        message: 'Preview not found',
      }, { status: 404 })
    }
    
    // Get queue position if still queued
    let queuePosition: number | null = null
    let processing = false
    
    if (preview.status === 'queued') {
      queuePosition = await getJobPosition(previewId)
      processing = await isJobProcessing(previewId)
    }
    
    return NextResponse.json({
      success: true,
      status: preview.status,
      queuePosition,
      processing,
      errorMessage: preview.error_message,
      createdAt: preview.created_at,
    })
  } catch (error: any) {
    console.error('❌ [Status API] Error:', error)
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error',
    }, { status: 500 })
  }
}
