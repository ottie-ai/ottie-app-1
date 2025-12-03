'use client'

import { LottieIcon } from './lottie-icon'
import addCardAnimation from '@/lib/lottie/system-regular-40-add-card-hover-add-card.json'
import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useTheme } from 'next-themes'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'

interface LottieAddCardIconProps {
  className?: string
  size?: number
  invertTheme?: boolean
  autoLoop?: boolean // If true, automatically loop animation every 5 seconds
}

/**
 * Add Card Icon Component for New Site buttons
 * Uses Lottie animation with hover effect
 * invertTheme: invert theme colors (for primary buttons where bg color is opposite of theme)
 * autoLoop: automatically play animation every 5 seconds (for empty states)
 */
export function LottieAddCardIcon({ className = '', size = 18, invertTheme = true, autoLoop = false }: LottieAddCardIconProps) {
  const { resolvedTheme } = useTheme()
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Determine if dark mode is active
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    return resolvedTheme === 'dark' || (resolvedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [resolvedTheme])

  // Get the target color based on theme
  const targetColor = useMemo(() => {
    const effectiveIsDark = invertTheme ? !isDark : isDark
    return effectiveIsDark 
      ? [0.95, 0.95, 0.98] // Light color for dark backgrounds
      : [0.1, 0.1, 0.2]  // Dark color for light backgrounds
  }, [isDark, invertTheme])

  // Determine if we should apply opacity
  const shouldApplyOpacity = useMemo(() => {
    const effectiveIsDark = invertTheme ? !isDark : isDark
    return effectiveIsDark
  }, [isDark, invertTheme])

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
    if (!addCardAnimation) return addCardAnimation
    const cloned = JSON.parse(JSON.stringify(addCardAnimation))

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

  // Auto-loop animation every 5 seconds
  useEffect(() => {
    if (!autoLoop || !lottieRef.current || !isMounted) return

    const playAnimation = () => {
      if (lottieRef.current && !isHovered) {
        lottieRef.current.goToAndPlay(0, true)
      }
    }

    // Play once on mount after a short delay
    const initialTimeout = setTimeout(playAnimation, 500)

    // Then repeat every 5 seconds
    intervalRef.current = setInterval(playAnimation, 5000)

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoLoop, isMounted, isHovered])

  // Detect hover on parent element
  useEffect(() => {
    if (!containerRef.current || !isMounted) return

    const container = containerRef.current
    const parent = container.closest('a, button, [role="button"], [data-slot="dropdown-menu-item"], .group')
    
    if (!parent) return

    const handleMouseEnter = () => setIsHovered(true)
    const handleMouseLeave = () => setIsHovered(false)

    parent.addEventListener('mouseenter', handleMouseEnter)
    parent.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      parent.removeEventListener('mouseenter', handleMouseEnter)
      parent.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [isMounted])

  // Handle animation on hover
  useEffect(() => {
    if (!lottieRef.current || !isMounted) return

    const lottieInstance = lottieRef.current

    if (isHovered) {
      lottieInstance.goToAndPlay(0, true)
    } else {
      lottieInstance.stop()
      lottieInstance.goToAndStop(0, true)
    }
  }, [isHovered, isMounted])

  // Initialize animation to frame 0 on mount
  const onAnimationLoad = useCallback(() => {
    if (lottieRef.current) {
      lottieRef.current.goToAndStop(0, true)
    }
  }, [])

  if (!isMounted) {
    return <div className={className} style={{ width: size, height: size }} />
  }

  // If autoLoop is enabled, use custom Lottie component
  if (autoLoop) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ 
          width: size, 
          height: size,
          opacity: shouldApplyOpacity ? 0.85 : 1,
          pointerEvents: 'none' // Prevent hover events on icon itself
        }}
      >
        <Lottie
          lottieRef={lottieRef}
          animationData={themedAnimationData}
          style={{ width: size, height: size }}
          loop={false}
          autoplay={false}
          onLoadedData={onAnimationLoad}
        />
      </div>
    )
  }

  // Otherwise use standard LottieIcon
  return <LottieIcon animationData={addCardAnimation} className={className} size={size} invertTheme={invertTheme} />
}

