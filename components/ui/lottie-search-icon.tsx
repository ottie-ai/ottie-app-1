'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useTheme } from 'next-themes'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import searchAnimation from '@/lib/lottie/system-regular-42-search-hover-pinch.json'

interface LottieSearchIconProps {
  className?: string
  size?: number
}

/**
 * Search Icon Component
 * Uses Lottie animation that triggers on input focus
 */
export function LottieSearchIcon({ className = '', size = 18 }: LottieSearchIconProps) {
  const { resolvedTheme } = useTheme()
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Determine if dark mode is active
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    return resolvedTheme === 'dark' || (resolvedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [resolvedTheme])

  // Get target color
  const targetColor = useMemo(() => {
    return isDark 
      ? [0.95, 0.95, 0.98] // Light color for dark mode
      : [0.1, 0.1, 0.2]  // Dark color for light mode
  }, [isDark])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Detect focus on sibling input element
  useEffect(() => {
    if (!containerRef.current || !isMounted) return

    const container = containerRef.current
    // Find the parent container and then the input sibling
    const parent = container.parentElement
    if (!parent) return

    const input = parent.querySelector('input')
    if (!input) return

    const handleFocus = () => setIsFocused(true)
    const handleBlur = () => setIsFocused(false)

    input.addEventListener('focus', handleFocus)
    input.addEventListener('blur', handleBlur)

    return () => {
      input.removeEventListener('focus', handleFocus)
      input.removeEventListener('blur', handleBlur)
    }
  }, [isMounted])

  // Update colors in animation data
  const themedAnimationData = useMemo(() => {
    if (!searchAnimation) return searchAnimation

    const cloned = JSON.parse(JSON.stringify(searchAnimation))

    // Helper to update colors recursively
    const updateColors = (obj: any): void => {
      if (!obj || typeof obj !== 'object') return

      if (Array.isArray(obj)) {
        obj.forEach(item => updateColors(item))
        return
      }

      // Update control layer
      if (obj.nm === 'control' && obj.ef) {
        obj.ef.forEach((effect: any) => {
          if (effect.nm === 'primary' && effect.ef) {
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

      // Update fill and stroke colors
      if ((obj.ty === 'fl' || obj.ty === 'st') && obj.c && obj.c.k && Array.isArray(obj.c.k)) {
        if (typeof obj.c.k[0] === 'number') {
          const alpha = obj.c.k.length > 3 ? obj.c.k[3] : 1
          obj.c.k = [...targetColor, alpha]
        }
      }

      // Recursively process all properties
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          updateColors(obj[key])
        }
      }
    }

    updateColors(cloned)
    return cloned
  }, [targetColor])

  // Handle animation on focus
  useEffect(() => {
    if (!lottieRef.current || !isMounted) return

    const lottieInstance = lottieRef.current
    const totalFrames = searchAnimation?.op || 60

    if (isFocused) {
      lottieInstance.setDirection(1)
      lottieInstance.goToAndPlay(0, true)
    } else {
      lottieInstance.stop()
      lottieInstance.goToAndStop(0, true)
    }
  }, [isFocused, isMounted])

  // Initialize animation to frame 0 on mount
  const onAnimationLoad = useCallback(() => {
    if (lottieRef.current) {
      lottieRef.current.goToAndStop(0, true)
    }
  }, [])

  if (!isMounted) {
    return <div className={className} style={{ width: size, height: size }} />
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ 
        width: size, 
        height: size,
        opacity: isDark ? 0.85 : 1
      }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={themedAnimationData}
        style={{ width: size, height: size }}
        loop={false}
        autoplay={false}
        onComplete={() => {
          if (lottieRef.current && isFocused) {
            lottieRef.current.goToAndStop(themedAnimationData?.op || 60, true)
          }
        }}
        onLoadedData={onAnimationLoad}
      />
    </div>
  )
}

