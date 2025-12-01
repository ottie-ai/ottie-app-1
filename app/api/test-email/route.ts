import { NextResponse } from 'next/server'
import { sendInviteEmail } from '@/lib/email'

/**
 * Test endpoint to verify Resend email configuration
 * Only available when ENABLE_TEST_ENDPOINTS=true
 * 
 * Usage: POST /api/test-email
 * Body: { "to": "your-email@example.com" }
 */
export async function POST(request: Request) {
  // Only allow when explicitly enabled via environment variable
  if (process.env.ENABLE_TEST_ENDPOINTS !== 'true') {
    return NextResponse.json(
      { error: 'Not available' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { to } = body

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
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

