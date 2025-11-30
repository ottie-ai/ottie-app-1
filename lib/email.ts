import { Resend } from 'resend'

// Initialize Resend with API key
// You need to set RESEND_API_KEY in your .env.local file
// Get your API key from https://resend.com/api-keys
const resend = new Resend(process.env.RESEND_API_KEY)

// Default from address - update this to your verified domain
// For development, you can use 'onboarding@resend.dev'
// Format must be: "email@example.com" or "Name <email@example.com>"
function getFromEmail(): string {
  let fromEmail = process.env.RESEND_FROM_EMAIL || 'Ottie <onboarding@resend.dev>'
  
  // Remove surrounding quotes if present (common in env variables)
  fromEmail = fromEmail.trim()
  if ((fromEmail.startsWith('"') && fromEmail.endsWith('"')) || 
      (fromEmail.startsWith("'") && fromEmail.endsWith("'"))) {
    fromEmail = fromEmail.slice(1, -1).trim()
  }
  
  // Validate format - must be either "email@domain.com" or "Name <email@domain.com>"
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const nameEmailRegex = /^.+ <[^\s@]+@[^\s@]+\.[^\s@]+>$/
  
  // If it's just an email without name, add default name
  if (emailRegex.test(fromEmail) && !fromEmail.includes('<')) {
    return `Ottie <${fromEmail}>`
  }
  
  // If it's already in correct format, return as is
  if (nameEmailRegex.test(fromEmail) || emailRegex.test(fromEmail)) {
    return fromEmail
  }
  
  // Fallback to default
  console.warn('[EMAIL] Invalid RESEND_FROM_EMAIL format, using default. Expected: "email@domain.com" or "Name <email@domain.com>". Got:', fromEmail)
  return 'Ottie <onboarding@resend.dev>'
}

const FROM_EMAIL = getFromEmail()

interface SendInviteEmailParams {
  to: string
  workspaceName: string
  inviterName: string
  role: 'admin' | 'agent'
  inviteUrl: string
}

/**
 * Send workspace invitation email
 */
export async function sendInviteEmail({
  to,
  workspaceName,
  inviterName,
  role,
  inviteUrl,
}: SendInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  // Check if Resend API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('[EMAIL] RESEND_API_KEY not configured. Skipping email send.')
    console.log(`[DEV] Invite URL for ${to}: ${inviteUrl}`)
    return { success: false, error: 'Email service not configured. Please set RESEND_API_KEY.' }
  }

  // Validate FROM_EMAIL format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const nameEmailRegex = /^.+ <[^\s@]+@[^\s@]+\.[^\s@]+>$/
  
  if (!nameEmailRegex.test(FROM_EMAIL) && !emailRegex.test(FROM_EMAIL)) {
    console.error('[EMAIL] Invalid FROM_EMAIL format:', FROM_EMAIL)
    return { 
      success: false, 
      error: `Invalid email format. FROM_EMAIL must be "email@domain.com" or "Name <email@domain.com>". Current: ${FROM_EMAIL}` 
    }
  }
  
  if (FROM_EMAIL.includes('onboarding@resend.dev')) {
    console.warn('[EMAIL] Using default Resend email. Configure RESEND_FROM_EMAIL with your verified domain.')
  }

  const roleDescription = role === 'admin' 
    ? 'an Admin (can manage team and settings)' 
    : 'an Agent (can create and manage sites)'

  console.log('[EMAIL] Attempting to send invitation email:', {
    to,
    from: FROM_EMAIL,
    fromRaw: process.env.RESEND_FROM_EMAIL,
    workspaceName,
    hasApiKey: !!process.env.RESEND_API_KEY,
  })

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Join ${workspaceName} on Ottie`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Workspace Invitation</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000; min-height: 100vh;">
              <tr>
                <td align="center" style="padding: 60px 20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 400px;">
                    <!-- Logo -->
                    <tr>
                      <td align="center" style="padding-bottom: 50px;">
                        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #fda90f 0%, #f5a82d 25%, #e5a4b4 50%, #d9a1e1 75%, #c89eff 100%); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center;">
                          <!-- Using text instead of SVG/PNG for maximum email client compatibility -->
                          <!-- Gmail and many email clients don't support SVG, and external images may be blocked -->
                          <span style="font-size: 36px; font-weight: 700; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1; letter-spacing: -1px;">O</span>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Title -->
                    <tr>
                      <td align="center" style="padding-bottom: 24px;">
                        <h1 style="margin: 0; font-size: 32px; font-weight: 400; color: #ffffff; letter-spacing: -0.5px;">
                          Join ${workspaceName}
                        </h1>
                      </td>
                    </tr>
                    
                    <!-- Description -->
                    <tr>
                      <td align="center" style="padding-bottom: 40px;">
                        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #888888;">
                          ${inviterName} has invited you to join<br>
                          <strong style="color: #ffffff;">${workspaceName}</strong> as ${roleDescription}.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Button -->
                    <tr>
                      <td align="center" style="padding-bottom: 50px;">
                        <a href="${inviteUrl}" style="display: inline-block; background-color: #ffffff; color: #000000; font-size: 14px; font-weight: 500; text-decoration: none; padding: 14px 28px; border-radius: 999px;">
                          Accept Invitation
                        </a>
                      </td>
                    </tr>
                    
                    <!-- Expiry note -->
                    <tr>
                      <td align="center" style="padding-bottom: 60px;">
                        <p style="margin: 0; font-size: 13px; color: #666666;">
                          This invitation expires in 7 days.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td align="center">
                        <p style="margin: 0; font-size: 12px; color: #444444; line-height: 1.6;">
                          <a href="https://ottie.com" style="color: #666666; text-decoration: underline;">Ottie</a>
                          <br>
                          16192 Coastal Hwy, Lewes,<br>
                          DE 19958, United States
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: `
Join ${workspaceName}

${inviterName} has invited you to join ${workspaceName} as ${roleDescription}.

Accept the invitation:
${inviteUrl}

This invitation expires in 7 days.

---
Ottie
16192 Coastal Hwy, Lewes,
DE 19958, United States
      `.trim(),
    })

    if (error) {
      console.error('[EMAIL] Resend API error:', {
        message: error.message,
        name: error.name,
        error,
      })
      return { success: false, error: `Failed to send email: ${error.message}` }
    }

    if (!data?.id) {
      console.error('[EMAIL] No email ID returned from Resend')
      return { success: false, error: 'Email service returned no confirmation' }
    }

    console.log('[EMAIL] Invitation email sent successfully:', {
      emailId: data.id,
      to,
      from: FROM_EMAIL,
    })
    return { success: true }
  } catch (error) {
    console.error('[EMAIL] Exception while sending email:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    }
  }
}

