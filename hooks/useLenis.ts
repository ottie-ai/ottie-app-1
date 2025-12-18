'use client'

import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

/**
 * useLenis - Hook for initializing and managing Lenis smooth scrolling
 * 
 * USAGE:
 * - Use this hook in site components (PublishedSitePage, preview pages)
 * - Automatically initializes Lenis with smooth scrolling
 * - Returns the Lenis instance for advanced usage
 * 
 * INTEGRATION:
 * - Default smooth scrolling for all published sites
 * - Works with scroll pinning (ScrollStack, HighlightsTimeline)
 * - Compatible with builder/preview environments
 */
export function useLenis(options?: {
  lerp?: number
  orientation?: 'vertical' | 'horizontal'
  gestureOrientation?: 'vertical' | 'horizontal'
  smoothWheel?: boolean
  smoothTouch?: boolean
  touchMultiplier?: number
  wheelMultiplier?: number
  infinite?: boolean
}) {
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

  return lenisRef.current
}
