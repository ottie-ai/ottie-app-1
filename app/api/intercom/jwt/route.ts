import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import jwt from 'jsonwebtoken'

/**
 * API route to generate Intercom JWT token for authenticated users
 * GET /api/intercom/jwt
 * 
 * Returns a JWT token signed with the Intercom Messenger API Secret
 * that can be used to securely identify users in Intercom
 */
export async function GET() {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get Intercom API Secret from environment variables
    const apiSecret = process.env.INTERCOM_MESSENGER_API_SECRET

    if (!apiSecret) {
      console.error('INTERCOM_MESSENGER_API_SECRET is not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create JWT payload with user information
    const payload = {
      user_id: user.id,
      email: user.email || undefined,
      // Add any other sensitive attributes here if needed
    }

    // Generate JWT token (expires in 1 hour)
    const token = jwt.sign(payload, apiSecret, { expiresIn: '1h' })

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Error generating Intercom JWT:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

