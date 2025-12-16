'use client'

import { LottieSpinner } from '@/components/ui/lottie-spinner'
import { useEffect, useState } from 'react'
import Script from 'next/script'

/**
 * Builder loading fallback
 * - Shows loader while layout.tsx is fetching site config
 * - Sets background immediately via inline script (before React hydration)
 * - Tries to use cached loader config from localStorage
 * - Falls back to black (most users have dark loader)
 */

export default function BuilderLoading() {
  const [bgColor, setBgColor] = useState('#000000') // Default to black (most users have dark loader)

  useEffect(() => {
    // Add site-route class to hide workspace background
    document.body.classList.add('site-route')
    document.documentElement.classList.add('site-route')
    
    // Try to get cached loader config from localStorage
    try {
      const siteId = window.location.pathname.split('/').pop()
      const cached = localStorage.getItem(`loader-config-${siteId}`)
      if (cached) {
        const config = JSON.parse(cached)
        const newBg = config.type !== 'none' && config.colorScheme === 'dark' ? '#000000' : '#ffffff'
        setBgColor(newBg)
        document.body.style.backgroundColor = newBg
        document.documentElement.style.backgroundColor = newBg
      } else {
        // No cache - use default black (will be overridden by layout.tsx if needed)
        document.body.style.backgroundColor = '#000000'
        document.documentElement.style.backgroundColor = '#000000'
      }
    } catch (e) {
      // Ignore errors - use default black
      document.body.style.backgroundColor = '#000000'
      document.documentElement.style.backgroundColor = '#000000'
    }
    
    return () => {
      document.body.classList.remove('site-route')
      document.documentElement.classList.remove('site-route')
    }
  }, [])

  return (
    <>
      {/* Set background immediately via inline script (before React hydration) */}
      <Script
        id="builder-loading-bg"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var siteId = window.location.pathname.split('/').pop();
                var cached = localStorage.getItem('loader-config-' + siteId);
                var bgColor = '#000000'; // Default to black
                if (cached) {
                  var config = JSON.parse(cached);
                  if (config.type !== 'none' && config.colorScheme === 'dark') {
                    bgColor = '#000000';
                  } else {
                    bgColor = '#ffffff';
                  }
                }
                document.body.style.backgroundColor = bgColor;
                document.documentElement.style.backgroundColor = bgColor;
                document.body.classList.add('site-route');
                document.documentElement.classList.add('site-route');
              } catch(e) {
                // Fallback to black
                document.body.style.backgroundColor = '#000000';
                document.documentElement.style.backgroundColor = '#000000';
                document.body.classList.add('site-route');
                document.documentElement.classList.add('site-route');
              }
            })();
          `,
        }}
      />
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: bgColor }}
      >
        <LottieSpinner size={32} />
      </div>
    </>
  )
}


