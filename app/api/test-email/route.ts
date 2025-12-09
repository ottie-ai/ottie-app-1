import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { sendInviteEmail } from '@/lib/email'
import { cookies } from 'next/headers'

/**
 * Test endpoint to verify Resend email configuration
 * Only available when ENABLE_TEST_ENDPOINTS=true
 * 
 * GET /api/test-email - Returns CSRF token in cookie
 * POST /api/test-email - Requires CSRF token in body matching cookie
 * Body: { "to": "your-email@example.com", "csrfToken": "token-from-cookie" }
 */
export async function GET() {
  // Only allow when explicitly enabled via environment variable
  if (process.env.ENABLE_TEST_ENDPOINTS !== 'true') {
    return NextResponse.json(
      { error: 'Not available' },
      { status: 403 }
    )
  }

  // Generate CSRF token and set it in cookie
  const csrfToken = randomUUID()
  const response = NextResponse.json({ csrfToken })
  response.cookies.set('csrf-token', csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60, // 1 hour
  })

  return response
}

export async function POST(request: Request) {
  // Only allow when explicitly enabled via environment variable
  if (process.env.ENABLE_TEST_ENDPOINTS !== 'true') {
    return NextResponse.json(
      { error: 'Not available' },
      { status: 403 }
    )
  }

  // CSRF Protection: Verify token from cookie matches token in request body
  const cookieStore = await cookies()
  const csrfCookie = cookieStore.get('csrf-token')
  const requestBody = await request.json().catch(() => ({}))
  const csrfToken = requestBody.csrfToken

  if (!csrfCookie || !csrfToken || csrfCookie.value !== csrfToken) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }

  try {
    const { to } = requestBody

    if (!to || typeof to !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "to" email address' },
        { status: 400 }
      )
    }

    // Check environment variables
    const hasApiKey = !!process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Ottie <onboarding@resend.dev>'

    const result = await sendInviteEmail({
      to,
      workspaceName: 'Test Workspace',
      inviterName: 'Test User',
      role: 'agent',
      inviteUrl: 'https://app.ottie.com/invite/test-token',
    })

    return NextResponse.json({
      success: result.success,
      error: result.error,
      config: {
        hasApiKey,
        fromEmail,
        nodeEnv: process.env.NODE_ENV,
      },
    })
  } catch (error) {
    // Log full error server-side for debugging
    console.error('[Test Email] Error:', error)
    
    // Return sanitized error to client (no stack trace)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        // Stack trace only in development
        ...(process.env.NODE_ENV === 'development' && error instanceof Error && { stack: error.stack })
      },
      { status: 500 }
    )
  }
}

