import { NextRequest, NextResponse } from 'next/server'

/**
 * API endpoint to display client's IP address
 * Useful for debugging access control and finding your IP to add to ALLOWED_IPS
 * 
 * Visit: /api/my-ip
 */
export async function GET(request: NextRequest) {
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
  const accessMode = process.env.NEXT_PUBLIC_ACCESS_MODE || 'public'
  const allowedIps = (process.env.ALLOWED_IPS || '')
    .split(',')
    .map(ip => ip.trim())
    .filter(Boolean)
  
  const isIpAllowed = allowedIps.length > 0 && allowedIps.includes(clientIp)
  
  return NextResponse.json({
    clientIp,
    allHeaders,
    accessControl: {
      mode: accessMode,
      allowedIps: allowedIps.length > 0 ? allowedIps : ['(empty - add IPs to ALLOWED_IPS)'],
      isYourIpAllowed: accessMode === 'public' ? 'N/A (public mode)' : isIpAllowed,
    },
    instructions: {
      message: 'Copy your IP address from "clientIp" field above',
      step1: 'Go to Vercel Dashboard → Your Project → Settings → Environment Variables',
      step2: 'Find ALLOWED_IPS variable (or create it)',
      step3: `Add or update value: ${clientIp}${allowedIps.length > 0 ? `,${allowedIps.join(',')}` : ''}`,
      step4: 'Save and wait for automatic redeploy',
    },
  }, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  })
}

