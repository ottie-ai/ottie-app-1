'use client'
import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useTheme } from 'next-themes'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import checkAnimation from '@/lib/lottie/system-regular-31-check-hover-pinch.json'

interface LottieCheckIconProps {
  className?: string
  size?: number
  autoPlay?: boolean // If true, play animation once on mount
}

export function LottieCheckIcon({ className = '', size = 18, autoPlay = false }: LottieCheckIconProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const [isMounted, setIsMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Determine if dark mode is active
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    return resolvedTheme === 'dark' || (resolvedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [resolvedTheme])

  // Get target color based on theme (same logic as LottieIcon)
  const targetColor = useMemo(() => {
    return isDark 
      ? [0.95, 0.95, 0.98] // Light color for dark backgrounds
      : [0.1, 0.1, 0.2]  // Dark color for light backgrounds
  }, [isDark])

  // Helper function to update colors recursively (same as LottieIcon)
  const updateColorsInObject = useCallback((obj: any) => {
    if (!obj || typeof obj !== 'object') return

    // Check if this is a color property (array of 3-4 numbers between 0-1)
    if (Array.isArray(obj)) {
      return
    }

    // Update color in control layer effects
    if (obj.nm === 'Color' && obj.v && obj.k !== undefined) {
      // This is a color property - update the value
      // Control layer colors typically use RGB only (3 values), not RGBA
      const rgbColor = targetColor.slice(0, 3)
      if (Array.isArray(obj.v.k)) {
        // Animated color or static color array
        obj.v.k = [...rgbColor]
      } else if (typeof obj.v === 'object' && obj.v.k !== undefined) {
        obj.v.k = [...rgbColor]
      }
    }

    // Check for fill (ty: "fl") and stroke (ty: "st") with color property "c"
    if ((obj.ty === 'fl' || obj.ty === 'st') && obj.c) {
      if (obj.c.k && Array.isArray(obj.c.k)) {
        // Check if it's a static color (array of 3-4 values) or animated
        if (typeof obj.c.k[0] === 'number') {
          // Static color - replace with target color (RGB only, opacity handled via CSS)
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

  // Create themed animation data with correct colors (same logic as LottieIcon)
  const themedAnimationData = useMemo(() => {
    if (!checkAnimation) return checkAnimation

    // Deep clone the animation data
    const cloned = JSON.parse(JSON.stringify(checkAnimation))

    // Update colors in the control layer (for expressions)
    if (cloned.layers && Array.isArray(cloned.layers)) {
      cloned.layers.forEach((layer: any) => {
        if (layer.nm === 'control') {
          if (layer.ef && Array.isArray(layer.ef)) {
            layer.ef.forEach((effect: any) => {
              if (effect.nm === 'primary' && effect.ef && Array.isArray(effect.ef)) {
                effect.ef.forEach((colorProp: any) => {
                  if (colorProp.nm === 'Color' && colorProp.v) {
                    // Update the color value - this affects expressions
                    // Control layer colors typically use RGB only (3 values), not RGBA
                    const rgbColor = targetColor.slice(0, 3)
                    if (colorProp.v.k !== undefined) {
                      colorProp.v.k = [...rgbColor]
                    } else if (Array.isArray(colorProp.v)) {
                      // Direct array value - update RGB only
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

    // Also update all fill and stroke colors directly in the animation
    updateColorsInObject(cloned)

    return cloned
  }, [checkAnimation, targetColor, updateColorsInObject])

  // Auto-play animation on mount if autoPlay is true
  useEffect(() => {
    if (autoPlay && lottieRef.current && isMounted) {
      const timeout = setTimeout(() => {
        if (lottieRef.current) {
          lottieRef.current.goToAndPlay(0, true)
        }
      }, 50)
      return () => clearTimeout(timeout)
    }
  }, [autoPlay, isMounted])

  if (!isMounted) {
    return <div className={className} style={{ width: size, height: size }} />
  }

  return (
    <div className={className} style={{ width: size, height: size }}>
      <Lottie
        lottieRef={lottieRef}
        animationData={themedAnimationData}
        style={{ width: size, height: size }}
        loop={false}
        autoplay={false}
        onComplete={() => {
          if (lottieRef.current) {
            // Stay at last frame after animation completes
            const totalFrames = checkAnimation?.op || 60
            lottieRef.current.goToAndStop(totalFrames - 1, true)
          }
        }}
      />
    </div>
  )
}

