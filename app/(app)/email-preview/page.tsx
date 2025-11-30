/**
 * Email Preview Page
 * 
 * Preview email templates without sending them.
 * Only available in development mode.
 * 
 * URL: /email-preview
 */

import { redirect } from 'next/navigation'

// Only allow in development
export default function EmailPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    redirect('/overview')
  }

  const inviterName = 'Sonia Adamec'
  const workspaceName = 'Adamec Reality'
  const role: 'admin' | 'agent' = 'agent'
  const getRoleDescription = (r: 'admin' | 'agent') => r === 'admin' ? 'an Admin' : 'an Agent'
  const roleDescription = getRoleDescription(role)
  const inviteUrl = 'http://app.localhost:3000/invite/abc123xyz'

  // This is the same HTML from lib/email.ts
  const emailHtml = `
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
                      <svg width="40" height="40" viewBox="0 0 104 105" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M64.1533 0C64.4902 12.9567 69.5982 23.6894 79.6943 31.8545C86.6667 37.4932 94.7378 40.4266 103.639 40.7432V64.3857C85.1152 64.3976 64.5748 80.2318 64.1436 104.999H40.8438C40.6221 93.8065 36.6974 84.1025 28.7451 76.1826C20.8373 68.307 11.1917 64.3918 0 64.1738V40.8877C22.7104 40.5504 40.5972 22.4718 40.8721 0H64.1533ZM52.5244 36.8252C48.1079 42.9632 42.9675 48.1732 36.8076 52.5088C42.9832 56.8524 48.1253 62.0588 52.4561 68.1006C54.1821 65.9963 55.7127 63.9624 57.4229 62.0938C59.140 60.2175 61.0364 58.5055 63.0225 56.5693C64.7176 55.2107 66.413 53.8517 68.1543 52.4561C62.0948 48.1837 56.9302 42.9915 52.5244 36.8252Z" fill="#ffffff"/>
                      </svg>
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
  `

  return (
    <div className="min-h-screen bg-zinc-900 p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">📧 Email Preview</h1>
        <p className="text-zinc-400">Preview email templates without sending them. Only visible in development.</p>
        
        {/* Controls */}
        <div className="mt-4 flex gap-4 flex-wrap">
          <div className="bg-zinc-800 rounded-lg px-4 py-2 text-sm">
            <span className="text-zinc-400">Template:</span>{' '}
            <span className="text-white font-medium">Workspace Invitation</span>
          </div>
          <div className="bg-zinc-800 rounded-lg px-4 py-2 text-sm">
            <span className="text-zinc-400">Inviter:</span>{' '}
            <span className="text-white">{inviterName}</span>
          </div>
          <div className="bg-zinc-800 rounded-lg px-4 py-2 text-sm">
            <span className="text-zinc-400">Workspace:</span>{' '}
            <span className="text-white">{workspaceName}</span>
          </div>
          <div className="bg-zinc-800 rounded-lg px-4 py-2 text-sm">
            <span className="text-zinc-400">Role:</span>{' '}
            <span className="text-white capitalize">{role}</span>
          </div>
        </div>
      </div>

      {/* Email Preview Frame */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-zinc-800 rounded-t-lg px-4 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-zinc-400 text-sm ml-2">Email Preview - {workspaceName} Invitation</span>
        </div>
        
        {/* Email Content */}
        <iframe
          srcDoc={emailHtml}
          className="w-full bg-black rounded-b-lg border-0"
          style={{ height: '700px' }}
          title="Email Preview"
        />
      </div>

      {/* Tips */}
      <div className="max-w-4xl mx-auto mt-8 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
        <h3 className="text-white font-medium mb-2">💡 Tips</h3>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li>• Edit the variables at the top of this file to test different scenarios</li>
          <li>• The email template is defined in <code className="text-zinc-300 bg-zinc-700 px-1 rounded">lib/email.ts</code></li>
          <li>• This page is only accessible in development mode</li>
          <li>• Test on mobile by resizing the browser window</li>
        </ul>
      </div>
    </div>
  )
}

