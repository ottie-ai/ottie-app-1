'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useTheme } from 'next-themes'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'

interface LottieIconProps {
  animationData: any
  className?: string
  size?: number
  useGradient?: boolean // If true, use gradient colors instead of theme colors
  invertTheme?: boolean // If true, invert the theme color (light icon on dark bg, dark icon on light bg)
  destructive?: boolean // If true, use destructive red color
  forceLightMode?: boolean // If true, always use dark color (light mode) regardless of theme
}

/**
 * Lottie Icon Component
 * 
 * Displays a Lottie animation that:
 * - Adapts colors to light/dark theme
 * - Animates on hover
 * - Can be used as a replacement for icon components
 */
export function LottieIcon({ animationData, className = '', size = 18, useGradient = false, invertTheme = false, destructive = false, forceLightMode = false }: LottieIconProps) {
  const { theme, resolvedTheme } = useTheme()
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [destructiveColor, setDestructiveColor] = useState<[number, number, number]>([239/255, 68/255, 68/255])

  // Determine if dark mode is active - use resolvedTheme and update when it changes
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    return resolvedTheme === 'dark' || (resolvedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [resolvedTheme])

  // Get destructive color from CSS variable to match exactly
  useEffect(() => {
    if (!destructive || typeof window === 'undefined') return
    
    const root = document.documentElement
    const computedColor = getComputedStyle(root).getPropertyValue('--destructive').trim()
    
    if (computedColor) {
      // Create a temporary element to convert oklch/rgb to rgb values
      const tempEl = document.createElement('div')
      tempEl.style.color = computedColor
      tempEl.style.position = 'absolute'
      tempEl.style.visibility = 'hidden'
      document.body.appendChild(tempEl)
      
      const rgb = getComputedStyle(tempEl).color
      document.body.removeChild(tempEl)
      
      // Parse rgb(r, g, b) or rgba(r, g, b, a)
      const match = rgb.match(/\d+/g)
      if (match && match.length >= 3) {
        const r = parseInt(match[0]) / 255
        const g = parseInt(match[1]) / 255
        const b = parseInt(match[2]) / 255
        setDestructiveColor([r, g, b])
      }
    }
  }, [destructive, isMounted])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Detect hover on parent element (e.g., Link in sidebar, DropdownMenuItem, SelectItem)
  useEffect(() => {
    if (!containerRef.current || !isMounted) return

    const container = containerRef.current
    // Look for interactive parent elements: links, buttons, dropdown menu items, select items, or elements with .group class
    const parent = container.closest('a, button, [role="button"], [data-slot="dropdown-menu-item"], [data-slot="select-item"], .group')
    
    if (!parent) return

    const handleMouseEnter = () => {
      setIsHovered(true)
      if (lottieRef.current && animationData) {
        const totalFrames = animationData?.op || 60
        lottieRef.current.setDirection(1)
        lottieRef.current.goToAndPlay(0, true)
      }
    }
    
    const handleMouseLeave = () => {
      setIsHovered(false)
      if (lottieRef.current && animationData) {
        const totalFrames = animationData?.op || 60
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
  }, [isMounted, animationData])

  // Get the target color based on theme/gradient/invertTheme/destructive
  const targetColor = useMemo(() => {
    if (destructive) {
      // Use the color from CSS variable to match exactly
      return destructiveColor
    }
    
    if (useGradient) {
      // Use gradient colors (middle color from gradient: #e5a4b4)
      // RGB: 229, 164, 180 -> normalized: [0.898, 0.643, 0.706]
      return [0.898, 0.643, 0.706]
    }
    
    // If forceLightMode is true, always use dark color (light mode)
    if (forceLightMode) {
      return [0.1, 0.1, 0.2]  // Dark color for light backgrounds
    }
    
    // Determine effective dark mode (invert if needed)
    // invertTheme is used for buttons where the icon needs to contrast with button background
    // e.g., dark button in light mode needs light icon, light button in dark mode needs dark icon
    const effectiveIsDark = invertTheme ? !isDark : isDark
    
    return effectiveIsDark 
      ? [0.95, 0.95, 0.98] // Light color for dark backgrounds
      : [0.1, 0.1, 0.2]  // Dark color for light backgrounds
  }, [isDark, useGradient, invertTheme, destructive, forceLightMode])

  // Determine if we should apply opacity (for light icons in dark mode)
  const shouldApplyOpacity = useMemo(() => {
    if (useGradient) return false
    if (forceLightMode) return false // Never apply opacity in forceLightMode
    const effectiveIsDark = invertTheme ? !isDark : isDark
    return effectiveIsDark // Apply opacity to light icons in dark mode
  }, [isDark, useGradient, invertTheme, forceLightMode])

  // Helper function to update colors recursively in any object
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

  // Create a modified version of animationData with theme-appropriate colors
  const themedAnimationData = useMemo(() => {
    if (!animationData) return animationData

    // Deep clone the animation data
    const cloned = JSON.parse(JSON.stringify(animationData))

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
  }, [animationData, targetColor, updateColorsInObject])

  // Check if this is a morph animation (settings icon)
  const isMorphAnimation = useMemo(() => {
    if (!animationData) return false
    // Check if animation has "morph" in markers or assets
    const hasMorphMarker = animationData.markers?.some((marker: any) => 
      marker.cm?.toLowerCase().includes('morph')
    )
    const hasMorphAsset = animationData.assets?.some((asset: any) => 
      asset.nm?.toLowerCase().includes('morph')
    )
    return hasMorphMarker || hasMorphAsset
  }, [animationData])

  // Handle animation on hover
  useEffect(() => {
    if (!lottieRef.current || !isMounted) return

    const lottieInstance = lottieRef.current
    // Use original animationData for total frames to avoid issues when themedAnimationData changes
    const totalFrames = animationData?.op || 60

    if (isHovered) {
      // Play animation forward from frame 0
      setDirection(1)
      lottieInstance.setDirection(1)
      lottieInstance.goToAndPlay(0, true)
    } else {
      if (isMorphAnimation) {
        // For morph animations, play backwards from last frame to frame 0
        setDirection(-1)
        lottieInstance.setDirection(-1)
        // Start from last frame and play backwards
        lottieInstance.goToAndPlay(totalFrames - 1, true)
      } else {
        // For regular hover animations, stop and reset to frame 0
        setDirection(1)
        lottieInstance.setDirection(1)
        lottieInstance.stop()
        lottieInstance.goToAndStop(0, true)
      }
    }
  }, [isHovered, isMounted, isMorphAnimation, animationData])


  // Initialize animation to frame 0 on mount
  const onAnimationLoad = useCallback(() => {
    if (lottieRef.current) {
      lottieRef.current.goToAndStop(0, true)
    }
  }, [])

  if (!isMounted) {
    // Return a placeholder div with the same size to prevent layout shift
    return <div className={className} style={{ width: size, height: size }} />
  }

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
        style={{ width: size, height: size, pointerEvents: 'none', userSelect: 'none' }}
        loop={false}
        autoplay={false}
        onComplete={() => {
          if (!lottieRef.current) return

          // Use original animationData for total frames
          const totalFrames = animationData?.op || 60

          if (isMorphAnimation) {
            // For morph animations: 
            // - If playing backwards (direction -1) and completed, stay at frame 0
            // - If playing forward (direction 1) and completed, stay at last frame if still hovered
            if (direction === -1 || !isHovered) {
              // Animation played backwards or hover ended - stay at frame 0
              lottieRef.current.goToAndStop(0, true)
            } else {
              // Animation played forward and still hovered - stay at last frame
              lottieRef.current.goToAndStop(totalFrames - 1, true)
            }
          } else {
            // For regular hover animations: keep at end if still hovered
            if (isHovered) {
              lottieRef.current.goToAndStop(totalFrames - 1, true)
            }
          }
        }}
        onLoadedData={onAnimationLoad}
      />
    </div>
  )
}

