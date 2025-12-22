'use client'

import { SiteLoader } from '@/components/site-loader'
import { useEffect, useState } from 'react'
import Script from 'next/script'
import type { LoaderConfig } from '@/types/builder'

/**
 * Preview loading fallback
 * - Sets background immediately via inline script (before React hydration)
 * - Tries to use cached loader config from localStorage
 * - Falls back to black (most users have dark loader)
 */

export default function PreviewLoading() {
  const [loaderConfig, setLoaderConfig] = useState<LoaderConfig>({ type: 'circle', colorScheme: 'dark' })

  useEffect(() => {
    // Add site-route class to hide workspace background
    document.body.classList.add('site-route')
    document.documentElement.classList.add('site-route')
    
    // Try to get cached loader config from localStorage
    try {
      const siteId = window.location.pathname.split('/').pop()
      const cached = localStorage.getItem(`loader-config-${siteId}`)
      if (cached) {
        const config = JSON.parse(cached) as LoaderConfig
        setLoaderConfig(config)
        
        // Set background color based on loader config
        const bgColor = config.type !== 'none' && config.colorScheme === 'dark' ? '#000000' : '#ffffff'
        document.body.style.backgroundColor = bgColor
        document.documentElement.style.backgroundColor = bgColor
      } else {
        // No cache - use default black
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

  // Don't render loader if type is 'none'
  if (loaderConfig.type === 'none') {
    return null
  }

  return (
    <>
      {/* Set background immediately via inline script (before React hydration) */}
      <Script
        id="preview-loading-bg"
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
      <SiteLoader config={loaderConfig} />
    </>
  )
}






