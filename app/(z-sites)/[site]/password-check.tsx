'use client'

import { useEffect, useState } from 'react'
import { SitePasswordForm } from '@/components/site-password-form'

interface PasswordCheckProps {
  siteId: string
  siteTitle: string
  passwordProtected: boolean
  children: React.ReactNode
}

/**
 * Client component that checks if user has access to password-protected site
 * Uses cookies to persist access for 24 hours
 */
export function PasswordCheck({ siteId, siteTitle, passwordProtected, children }: PasswordCheckProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    if (!passwordProtected) {
      setHasAccess(true)
      return
    }
    
    // Check if access cookie exists and is valid (within 24 hours)
    const cookieName = `site_access_${siteId}`
    const cookies = document.cookie.split(';')
    const accessCookie = cookies.find(c => c.trim().startsWith(`${cookieName}=`))
    
    if (accessCookie) {
      const timestamp = parseInt(accessCookie.split('=')[1])
      const now = Date.now()
      const hoursSinceAccess = (now - timestamp) / (1000 * 60 * 60)
      
      // Cookie is valid for 24 hours
      if (hoursSinceAccess < 24) {
        setHasAccess(true)
        return
      }
    }

    setHasAccess(false)
  }, [siteId, passwordProtected])

  if (hasAccess === null) {
    // Loading state - show nothing while checking
    return null
  }

  if (!hasAccess) {
    return (
      <SitePasswordForm
        siteId={siteId}
        siteTitle={siteTitle}
        onSuccess={() => setHasAccess(true)}
      />
    )
  }

  return <>{children}</>
}

