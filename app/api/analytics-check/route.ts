import { NextRequest, NextResponse } from 'next/server'

/**
 * API route to check if Analytics should be enabled
 * Excludes IPs listed in ANALYTICS_EXCLUDED_IPS environment variable
 */
export async function GET(request: NextRequest) {
  // Get excluded IPs from environment
  const excludedIps = (process.env.ANALYTICS_EXCLUDED_IPS || '')
    .split(',')
    .map(ip => ip.trim())
    .filter(Boolean)

  // Extract client IP from headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  // x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
  // The first IP is usually the original client IP
  const clientIp = forwardedFor?.split(',')[0]?.trim() ||
                   realIp?.trim() ||
                   cfConnectingIp?.trim() ||
                   'unknown'

  // Check if client IP is in excluded list
  const isExcluded = excludedIps.length > 0 && excludedIps.includes(clientIp)

  return NextResponse.json({
    enabled: !isExcluded,
    clientIp: clientIp,
  })
}

