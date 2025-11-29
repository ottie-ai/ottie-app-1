'use client'

import { useEffect } from 'react'

/**
 * Client-side UserJot SDK loader
 * Loads UserJot SDK only on the client to avoid hydration issues
 */
export function UserJotLoader() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initialize UserJot SDK
    if (!(window as any).$ujq) {
      ;(window as any).$ujq = []
      ;(window as any).uj = (window as any).uj || new Proxy(
        {},
        {
          get: (_: any, p: string) => (...a: any[]) => (window as any).$ujq.push([p, ...a]),
        }
      )

      const script = document.createElement('script')
      script.src = 'https://cdn.userjot.com/sdk/v2/uj.js'
      script.type = 'module'
      script.async = true
      
      // Wait for script to load before initializing
      script.onload = () => {
        // Initialize UserJot with widget enabled (we need it initialized to open it)
        if ((window as any).uj && (window as any).uj.init) {
          ;(window as any).uj.init('cmihpzrxs01v515mqs1d3rm12', {
            widget: true, // Enable widget so it can be opened programmatically
            trigger: 'custom', // Use custom trigger so we can open it programmatically
            position: 'right',
            theme: 'auto',
          })
          
          // Don't hide the widget button - we need it to open the widget
        } else {
          // If init is not available yet, queue it
          if ((window as any).$ujq) {
            ;(window as any).$ujq.push([
              'init',
              'cmihpzrxs01v515mqs1d3rm12',
              {
                widget: true,
                trigger: 'custom', // Use custom trigger so we can open it programmatically
                position: 'right',
                theme: 'auto',
              },
            ])
          }
        }
      }
      
      document.head.appendChild(script)
    }
  }, [])

  return null
}

