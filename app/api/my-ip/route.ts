import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API endpoint to display client's IP address
 * Useful for debugging access control and finding your IP to add to ALLOWED_IPS
 * 
 * SECURITY: Only available in development or to authenticated workspace owners
 * Visit: /api/my-ip
 */
export async function GET(request: NextRequest) {
  // Only allow in development OR for authenticated users
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  if (!isDevelopment) {
    // In production, require authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. This endpoint is only available to authenticated users.' },
        { status: 401 }
      )
    }
    
    // Check if user is workspace owner (has at least one ownership)
    const { data: memberships } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .limit(1)
    
    if (!memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: 'Forbidden. This endpoint is only available to workspace owners.' },
        { status: 403 }
      )
    }
  }
  
  // Extract client IP from headers (same logic as middleware)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  const clientIp = forwardedFor?.split(',')[0]?.trim() ||
                   realIp?.trim() ||
                   cfConnectingIp?.trim() ||
                   'unknown'
  
  const allHeaders = {
    'x-forwarded-for': forwardedFor || null,
    'x-real-ip': realIp || null,
    'cf-connecting-ip': cfConnectingIp || null,
  }
  
  // Get access control status from env
  // Only show in development (don't expose configuration in production)
  const accessMode = process.env.NEXT_PUBLIC_ACCESS_MODE || 'public'
  const allowedIpsCount = (process.env.ALLOWED_IPS || '').split(',').filter(Boolean).length
  
  return NextResponse.json({
    clientIp,
    allHeaders,
    environment: process.env.NODE_ENV,
    accessControl: isDevelopment ? {
      mode: accessMode,
      allowedIpsCount: allowedIpsCount,
      note: 'Full configuration only visible in development'
    } : {
      mode: 'Configuration hidden in production',
      note: 'Use this IP to configure ALLOWED_IPS in your deployment settings'
    },
    instructions: {
      message: 'Copy your IP address from "clientIp" field above',
      step1: 'Go to Vercel Dashboard → Your Project → Settings → Environment Variables',
      step2: 'Find ALLOWED_IPS variable (or create it)',
      step3: `Add your IP: ${clientIp}`,
      step4: 'Save and wait for automatic redeploy',
    },
  }, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  })
}

