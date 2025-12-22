'use client'

/**
 * SiteLoader - Customizable loading animation for published sites
 * 
 * ARCHITECTURE:
 * This component is specifically for PUBLIC sites only.
 * It's separate from admin UI loaders and can be customized per site.
 * 
 * USED BY:
 * - app/(z-sites)/[site]/site-content-client.tsx (public sites)
 * 
 * NOT USED BY:
 * - Admin UI (uses LottieSpinner from components/ui)
 * - Marketing pages (uses their own loaders)
 */

import { useRef, useEffect, useMemo, useCallback } from 'react'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import spinnerAnimation from '@/lib/lottie/system-regular-722-spinner-two-circles-loop-pulse.json'
import type { LoaderConfig } from '@/types/builder'

interface SiteLoaderProps {
  config?: LoaderConfig
  className?: string
  size?: number
}

/**
 * SiteLoader - Displays a customizable loading animation
 * Supports different loader types and light/dark color schemes
 */
export function SiteLoader({ config, className = '', size = 32 }: SiteLoaderProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null)

  // Default config: circle loader with light color scheme
  const loaderConfig: LoaderConfig = config || {
    type: 'circle',
    colorScheme: 'light',
  }

  // If loader is disabled, don't render anything
  if (loaderConfig.type === 'none') {
    return null
  }

  // Determine target color based on colorScheme
  // IMPORTANT: Uses muted colors like LottieSpinner for consistent appearance
  // - colorScheme: 'light' = WHITE background + muted gray icon
  // - colorScheme: 'dark' = BLACK background + muted gray icon
  // Lottie uses RGB values in 0-1 range (normalized 0-1, not 0-255)
  const targetColor = useMemo(() => {
    return loaderConfig.colorScheme === 'dark'
      ? [0.4, 0.4, 0.45] // Muted gray for dark backgrounds (like LottieSpinner)
      : [0.5, 0.5, 0.55]  // Muted gray for light backgrounds (like LottieSpinner)
  }, [loaderConfig.colorScheme])
  
  // Background color based on colorScheme
  const backgroundColor = loaderConfig.colorScheme === 'dark' ? '#000000' : '#ffffff'

  // Helper function to update colors recursively
  const updateColorsInObject = useCallback((obj: any) => {
    if (!obj || typeof obj !== 'object') return
    if (Array.isArray(obj)) return

    // Update color in control layer effects
    if (obj.nm === 'Color' && obj.v && obj.k !== undefined) {
      const rgbColor = targetColor.slice(0, 3)
      if (Array.isArray(obj.v.k)) {
        obj.v.k = [...rgbColor]
      } else if (typeof obj.v === 'object' && obj.v.k !== undefined) {
        obj.v.k = [...rgbColor]
      }
    }

    // Check for fill and stroke with color property
    if ((obj.ty === 'fl' || obj.ty === 'st') && obj.c) {
      if (obj.c.k && Array.isArray(obj.c.k)) {
        if (typeof obj.c.k[0] === 'number') {
          const alpha = obj.c.k.length > 3 ? obj.c.k[3] : 1
          obj.c.k = [...targetColor, alpha]
        }
      }
    }

    // Recursively process all properties
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key]
        if (Array.isArray(value)) {
          value.forEach((item: any) => updateColorsInObject(item))
        } else if (typeof value === 'object' && value !== null) {
          updateColorsInObject(value)
        }
      }
    }
  }, [targetColor])

  // Create themed animation data
  const themedAnimationData = useMemo(() => {
    if (!spinnerAnimation) return spinnerAnimation
    const cloned = JSON.parse(JSON.stringify(spinnerAnimation))

    // Update colors in control layer
    if (cloned.layers && Array.isArray(cloned.layers)) {
      cloned.layers.forEach((layer: any) => {
        if (layer.nm === 'control') {
          if (layer.ef && Array.isArray(layer.ef)) {
            layer.ef.forEach((effect: any) => {
              if (effect.nm === 'primary' && effect.ef && Array.isArray(effect.ef)) {
                effect.ef.forEach((colorProp: any) => {
                  if (colorProp.nm === 'Color' && colorProp.v) {
                    const rgbColor = targetColor.slice(0, 3)
                    if (colorProp.v.k !== undefined) {
                      colorProp.v.k = [...rgbColor]
                    } else if (Array.isArray(colorProp.v)) {
                      for (let i = 0; i < Math.min(3, targetColor.length); i++) {
                        colorProp.v[i] = targetColor[i]
                      }
                    }
                  }
                })
              }
            })
          }
        }
      })
    }

    updateColorsInObject(cloned)
    return cloned
  }, [targetColor, updateColorsInObject])

  // Initialize animation to play continuously with slower speed (like LottieSpinner)
  useEffect(() => {
    if (!lottieRef.current) return

    const lottieInstance = lottieRef.current
    // Set slower speed (0.6 = 60% of original speed) - same as LottieSpinner
    lottieInstance.setSpeed(0.6)
    // Play animation continuously
    lottieInstance.play()
  }, [])

  return (
    <div
      data-site-loader
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        minHeight: '100vh',
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: backgroundColor,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          position: 'relative',
        }}
      >
        {/* Lottie animation */}
        <Lottie
          lottieRef={lottieRef}
          animationData={themedAnimationData}
          style={{ width: size, height: size }}
          loop={true}
          autoplay={true}
        />
      </div>
    </div>
  )
}
