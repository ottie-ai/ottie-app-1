'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useTheme } from 'next-themes'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import spinnerAnimation from '@/lib/lottie/system-regular-722-spinner-two-circles-loop-pulse.json'

interface LottieSpinnerProps {
  className?: string
  size?: number
}

/**
 * Spinner Component using Lottie animation
 * Uses muted color and slower animation speed
 */
export function LottieSpinner({ className = '', size = 24 }: LottieSpinnerProps) {
  const { resolvedTheme } = useTheme()
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Determine if dark mode is active
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    return resolvedTheme === 'dark' || (resolvedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [resolvedTheme])

  // Get muted color based on theme
  // Muted color: lighter gray for dark mode, darker gray for light mode
  const targetColor = useMemo(() => {
    return isDark 
      ? [0.4, 0.4, 0.45] // Muted gray for dark backgrounds
      : [0.5, 0.5, 0.55]  // Muted gray for light backgrounds
  }, [isDark])

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

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Initialize animation to play continuously with slower speed
  useEffect(() => {
    if (!lottieRef.current || !isMounted) return

    const lottieInstance = lottieRef.current
    // Set slower speed (0.4 = 40% of original speed - much slower)
    lottieInstance.setSpeed(0.4)
    // Play animation continuously
    lottieInstance.play()
  }, [isMounted])

  if (!isMounted) {
    // Show a simple placeholder spinner while mounting
    return (
      <div className={className} style={{ width: size, height: size }} role="status" aria-label="Loading">
        <div className="w-full h-full border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{ 
        width: size, 
        height: size,
      }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={themedAnimationData}
        style={{ width: size, height: size }}
        loop={true}
        autoplay={true}
      />
    </div>
  )
}

