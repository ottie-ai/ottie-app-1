'use client'

import { useMemo, useEffect, useState, useRef, useCallback } from 'react'
import { useTheme } from 'next-themes'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import starAnimation from '@/lib/lottie/system-regular-95-star-hover-pinch.json'

interface LottieStarIconProps {
  className?: string
  size?: number
}

/**
 * Star Icon Component
 * Uses Lottie animation with hover effect
 * Always uses amber color (#f59e0b / rgb(245, 158, 11))
 */
export function LottieStarIcon({ className = '', size = 18 }: LottieStarIconProps) {
  const { resolvedTheme } = useTheme()
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Amber color: #f59e0b -> RGB: 245, 158, 11 -> normalized: [0.961, 0.620, 0.043]
  const amberColor: [number, number, number] = [245/255, 158/255, 11/255]

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Detect hover on parent element
  useEffect(() => {
    if (!containerRef.current || !isMounted) return

    const container = containerRef.current
    const parent = container.closest('button, a, [role="button"], [data-slot="select-item"], .group, [data-state]')
    
    if (!parent) return

    const handleMouseEnter = () => {
      setIsHovered(true)
      if (lottieRef.current) {
        lottieRef.current.setDirection(1)
        lottieRef.current.goToAndPlay(0, true)
      }
    }

    const handleMouseLeave = () => {
      setIsHovered(false)
      if (lottieRef.current) {
        const totalFrames = starAnimation?.op || 60
        lottieRef.current.setDirection(-1)
        lottieRef.current.goToAndPlay(totalFrames - 1, true)
      }
    }

    parent.addEventListener('mouseenter', handleMouseEnter)
    parent.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      parent.removeEventListener('mouseenter', handleMouseEnter)
      parent.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [isMounted])

  // Helper function to update colors recursively
  const updateColorsInObject = useCallback((obj: any): void => {
    if (!obj || typeof obj !== 'object') return

    if (Array.isArray(obj)) {
      obj.forEach(item => updateColorsInObject(item))
      return
    }

    // Update control layer
    if (obj.nm === 'control' && obj.ef) {
      obj.ef.forEach((effect: any) => {
        if (effect.nm === 'primary' && effect.ef) {
          effect.ef.forEach((colorProp: any) => {
            if (colorProp.nm === 'Color' && colorProp.v) {
              if (colorProp.v.k !== undefined) {
                colorProp.v.k = [...amberColor]
              } else if (Array.isArray(colorProp.v)) {
                for (let i = 0; i < Math.min(3, amberColor.length); i++) {
                  colorProp.v[i] = amberColor[i]
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
        obj.c.k = [...amberColor, alpha]
      }
    }

    // Recursively process all properties
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        updateColorsInObject(obj[key])
      }
    }
  }, [])

  // Create themed animation data with amber color
  const themedAnimationData = useMemo(() => {
    if (!starAnimation) return starAnimation
    const cloned = JSON.parse(JSON.stringify(starAnimation))
    updateColorsInObject(cloned)
    return cloned
  }, [updateColorsInObject])

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
        pointerEvents: 'none'
      }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={themedAnimationData}
        style={{ width: size, height: size }}
        loop={false}
        autoplay={false}
        onComplete={() => {
          if (!lottieRef.current) return
          const totalFrames = starAnimation?.op || 60
          if (isHovered) {
            lottieRef.current.goToAndStop(totalFrames - 1, true)
          }
        }}
        onLoadedData={onAnimationLoad}
      />
    </div>
  )
}

