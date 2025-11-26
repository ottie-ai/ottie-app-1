'use client'

import { useScroll, useSpring, useTransform, MotionValue } from 'framer-motion'
import { useRef, RefObject } from 'react'

// Global smooth spring config for all scroll animations
export const scrollSpringConfig = { stiffness: 300, damping: 40, restDelta: 0.001 }

interface UseScrollAnimationOptions {
  offset?: ["start end" | "start start" | "end start" | "end end", "start end" | "start start" | "end start" | "end end"]
}

interface UseScrollAnimationReturn {
  ref: RefObject<HTMLElement>
  progress: MotionValue<number>
  smoothProgress: MotionValue<number>
}

/**
 * Hook for scroll-based animations with smooth momentum effect
 * Use this for any element that needs scroll-triggered animations
 */
export function useScrollAnimation(options: UseScrollAnimationOptions = {}): UseScrollAnimationReturn {
  const ref = useRef<HTMLElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: options.offset || ["start end", "end start"]
  })
  
  const smoothProgress = useSpring(scrollYProgress, scrollSpringConfig)
  
  return {
    ref,
    progress: scrollYProgress,
    smoothProgress,
  }
}

/**
 * Hook for hero-specific scroll animations (starts from top)
 */
export function useHeroScrollAnimation() {
  const ref = useRef<HTMLElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  })
  
  const smoothProgress = useSpring(scrollYProgress, scrollSpringConfig)
  
  return {
    ref,
    progress: scrollYProgress,
    smoothProgress,
  }
}

/**
 * Create common scroll-based transforms
 */
export function useScrollTransforms(progress: MotionValue<number>) {
  return {
    // Fade in as element enters viewport
    fadeIn: useTransform(progress, [0, 0.3], [0, 1]),
    // Fade out as element leaves viewport
    fadeOut: useTransform(progress, [0.7, 1], [1, 0]),
    // Slide up on enter
    slideUp: useTransform(progress, [0, 0.3], ['30px', '0px']),
    // Slide down on enter
    slideDown: useTransform(progress, [0, 0.3], ['-30px', '0px']),
    // Scale up on enter
    scaleIn: useTransform(progress, [0, 0.3], [0.9, 1]),
  }
}

