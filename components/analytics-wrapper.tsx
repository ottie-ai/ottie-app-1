'use client'

import { Analytics } from '@vercel/analytics/next'
import { useEffect, useState } from 'react'

/**
 * Analytics wrapper that checks if Analytics should be enabled
 * Excludes visits from IPs listed in ANALYTICS_EXCLUDED_IPS
 */
export function AnalyticsWrapper() {
  const [enabled, setEnabled] = useState(true) // Default to enabled for better UX

  useEffect(() => {
    // Check if Analytics should be enabled
    fetch('/api/analytics-check')
      .then(res => res.json())
      .then(data => {
        setEnabled(data.enabled)
      })
      .catch(() => {
        // If API fails, default to enabled
        setEnabled(true)
      })
  }, [])

  // Only render Analytics if enabled
  if (!enabled) {
    return null
  }

  return <Analytics />
}

