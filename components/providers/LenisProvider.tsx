'use client'

import { useEffect, useRef, ReactNode } from 'react'
import Lenis from 'lenis'

/**
 * LenisProvider - Provides Lenis smooth scrolling to all child components
 * 
 * USAGE:
 * - Wrap site content with this provider
 * - Automatically initializes Lenis smooth scrolling
 * - Works with scroll pinning components (ScrollStack, HighlightsTimeline)
 * 
 * INTEGRATION:
 * - Used in PublishedSitePage for public sites
 * - Can be used in preview pages if needed
 * - Automatically detects and works with scroll containers
 */
interface LenisProviderProps {
  children: ReactNode
  options?: {
    lerp?: number
    orientation?: 'vertical' | 'horizontal'
    gestureOrientation?: 'vertical' | 'horizontal'
    smoothWheel?: boolean
    smoothTouch?: boolean
    touchMultiplier?: number
    wheelMultiplier?: number
    infinite?: boolean
  }
}

export function LenisProvider({ children, options }: LenisProviderProps) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    // Initialize Lenis with default luxury settings
    const lenis = new Lenis({
      lerp: options?.lerp ?? 0.05,           // Smoothness (0.05-0.1 pre luxusný feel)
      orientation: options?.orientation ?? 'vertical',
      gestureOrientation: options?.gestureOrientation ?? 'vertical',
      smoothWheel: options?.smoothWheel ?? true,    // Inertia pre wheel
      smoothTouch: options?.smoothTouch ?? false,   // Native touch pre mobile
      touchMultiplier: options?.touchMultiplier ?? 2,
      wheelMultiplier: options?.wheelMultiplier ?? 0.8, // Scroll speed (0.7-1.0)
      infinite: options?.infinite ?? false,
    })

    lenisRef.current = lenis

    // Animation loop
    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    // Cleanup
    return () => {
      lenis.destroy()
    }
  }, [
    options?.lerp,
    options?.orientation,
    options?.gestureOrientation,
    options?.smoothWheel,
    options?.smoothTouch,
    options?.touchMultiplier,
    options?.wheelMultiplier,
    options?.infinite,
  ])

  return <>{children}</>
}
