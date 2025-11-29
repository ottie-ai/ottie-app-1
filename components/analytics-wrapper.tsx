'use client'

import { Analytics } from '@vercel/analytics/next'
import { useEffect, useState } from 'react'

/**
 * Analytics wrapper that checks if Analytics should be enabled
 * Excludes visits from IPs listed in ANALYTICS_EXCLUDED_IPS
 */
export function AnalyticsWrapper() {
  const [enabled, setEnabled] = useState<boolean | null>(null) // null = checking, true/false = result

  useEffect(() => {
    // Check if Analytics should be enabled
    fetch('/api/analytics-check')
      .then(res => res.json())
      .then(data => {
        setEnabled(data.enabled)
        // Debug log
        if (!data.enabled) {
          console.log('[Analytics] Disabled for IP:', data.clientIp)
        }
      })
      .catch((error) => {
        // If API fails, default to enabled (but log error)
        console.warn('[Analytics] API check failed, defaulting to enabled:', error)
        setEnabled(true)
      })
  }, [])

  // Don't render anything until we know if Analytics should be enabled
  if (enabled === null) {
    return null
  }

  // Only render Analytics if enabled
  if (!enabled) {
    return null
  }

  return <Analytics />
}

