/**
 * Queue Worker API Endpoint
 * Processes scrape jobs from Redis queue
 * 
 * Self-triggering mechanism:
 * - After each job completes, worker automatically triggers itself for next job
 * - This enables continuous processing without fixed intervals
 * - Cron serves as fallback (runs every minute if worker stops)
 * 
 * Can be triggered by:
 * - Direct POST request after adding job to queue (starts processing)
 * - Self-triggering after job completion (continuous processing)
 * - Vercel cron job as fallback (every minute)
 * - Manual trigger for debugging
 */

import { NextRequest, NextResponse } from 'next/server'
import { processNextJob, processBatch, getQueueStats } from '@/lib/queue/scrape-queue'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max (Vercel Pro limit)

/**
 * POST /api/queue/process-scrape
 * Process next job in queue (or batch of jobs)
 */
export async function POST(request: NextRequest) {
  try {
    console.log(`🔵 [Worker API] POST request received`)
    
    // Check for internal authentication token (bypasses Vercel/platform auth)
    // This allows server actions to call the worker API without authentication issues
    const internalToken = request.headers.get('x-internal-token')
    const expectedToken = process.env.INTERNAL_API_TOKEN || process.env.VERCEL_URL || 'internal'
    const isCronHeader = request.headers.get('x-vercel-cron') === '1'
    
    // Debug logging for token validation
    console.log(`🔵 [Worker API] Token check - received: ${internalToken ? 'present' : 'missing'}, expected: ${expectedToken ? 'set' : 'not set'}, isCron: ${isCronHeader}`)
    
    // Allow if token matches OR if it's a cron job (Vercel cron has x-vercel-cron header)
    // In development, allow all requests
    const isValidInternalCall = internalToken === expectedToken || isCronHeader || process.env.NODE_ENV !== 'production'
    
    if (!isValidInternalCall) {
      console.warn(`⚠️ [Worker API] Unauthorized request - missing or invalid internal token`)
      console.warn(`⚠️ [Worker API] Token received: ${internalToken}, expected: ${expectedToken}`)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Check if this is a cron job (batch processing) or single job trigger
    const body = await request.json().catch(() => ({}))
    const batchSize = body.batch ? parseInt(body.batch) : 1
    const isCron = isCronHeader || body.cron === true
    
    console.log(`🔵 [Worker API] isCron: ${isCron}, batchSize: ${batchSize}`)
    
    // For cron: Check queue length and processing count first to avoid unnecessary processing
    if (isCron) {
      const stats = await getQueueStats()
      
      // If queue is empty and nothing is processing, return early (no need to process)
      if (stats.queueLength === 0 && stats.processingCount === 0) {
        console.log(`⏭️ [Worker API] Cron triggered but queue is empty, skipping...`)
        return NextResponse.json({
          success: true,
          message: 'Queue is empty, no processing needed',
          skipped: true,
        })
      }
      
      // If jobs are already processing (self-triggering is working), skip cron
      // Only process if queue has jobs but nothing is processing (self-trigger failed)
      if (stats.processingCount > 0) {
        console.log(`⏭️ [Worker API] Cron triggered but ${stats.processingCount} job(s) already processing (self-triggering working), skipping...`)
        return NextResponse.json({
          success: true,
          message: `Jobs already processing (${stats.processingCount}), self-triggering is working`,
          skipped: true,
          processingCount: stats.processingCount,
        })
      }
      
      // Queue has jobs or jobs are processing - proceed with processing
      if (batchSize > 1) {
        console.log(`🔵 [Worker API] Cron triggered, ${stats.queueLength} job(s) in queue, processing ${batchSize} job(s)...`)
        const processed = await processBatch(batchSize)
        
        return NextResponse.json({
          success: true,
          message: `Processed ${processed} job(s)`,
          processed,
          queueLength: stats.queueLength,
        })
      } else {
        // Single job processing (self-triggering will handle next jobs)
        console.log(`🔵 [Worker API] Cron triggered, ${stats.queueLength} job(s) in queue, processing next job...`)
        const result = await processNextJob()
        
        if (!result.success && result.error === 'No jobs in queue') {
          // This can happen if queue was cleared between check and processing
          return NextResponse.json({
            success: false,
            message: 'No jobs in queue',
            skipped: true,
          }, { status: 404 })
        }
        
        if (!result.success) {
          return NextResponse.json({
            success: false,
            message: result.error || 'Failed to process job',
            jobId: result.jobId,
          }, { status: 500 })
        }
        
        return NextResponse.json({
          success: true,
          message: 'Job processed successfully (next job will be auto-triggered)',
          jobId: result.jobId,
        })
      }
    } else {
      // Regular trigger (not cron) - process immediately (self-triggering will handle next jobs)
      console.log(`🔵 [Worker API] Processing next job (self-triggering enabled)...`)
      const result = await processNextJob()
      
      if (!result.success && result.error === 'No jobs in queue') {
        return NextResponse.json({
          success: false,
          message: 'No jobs in queue',
        }, { status: 404 })
      }
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          message: result.error || 'Failed to process job',
          jobId: result.jobId,
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        message: 'Job processed successfully (next job will be auto-triggered)',
        jobId: result.jobId,
      })
    }
  } catch (error: any) {
    console.error('❌ [Worker API] Error:', error)
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error',
    }, { status: 500 })
  }
}

/**
 * GET /api/queue/process-scrape
 * Get queue statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await getQueueStats()
    
    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error: any) {
    console.error('❌ [Worker API] Error getting stats:', error)
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error',
    }, { status: 500 })
  }
}
