'use client'

import { useRef, ReactNode } from 'react'
import { motion, useInView } from 'framer-motion'
import { cn } from '@/lib/utils'

// Global animation settings - change these to affect all animations
export const ANIMATION_CONFIG = {
  // Delay between each word in word reveal
  wordDelay: 0.05,
  // Base delay before animation starts (synchronized with background transition)
  baseDelay: 0.5, // Wait for background to start transitioning
  // Duration of fade/slide animations
  duration: 0.8,
  // Easing curve
  ease: [0.25, 0.1, 0.25, 1] as const,
  // How much of element needs to be visible to trigger (0-1)
  threshold: 0.4, // Trigger when more of element is visible
  // Whether animation should only play once
  once: true,
}

interface AnimateOnScrollProps {
  children: ReactNode
  className?: string
  /** Animation type */
  animation?: 'fade' | 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'none'
  /** Delay before animation starts (in seconds) */
  delay?: number
  /** Duration of animation (in seconds) */
  duration?: number
  /** Whether animation should only play once */
  once?: boolean
  /** Custom threshold for when animation triggers (0-1) */
  threshold?: number
}

const animationVariants = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  'fade-up': {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  },
  'fade-down': {
    hidden: { opacity: 0, y: -30 },
    visible: { opacity: 1, y: 0 },
  },
  'fade-left': {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0 },
  },
  'fade-right': {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
  none: {
    hidden: {},
    visible: {},
  },
}

/**
 * Wrapper component that animates children when they scroll into view
 * Use this for any content that should animate on scroll
 */
export function AnimateOnScroll({
  children,
  className,
  animation = 'fade-up',
  delay = ANIMATION_CONFIG.baseDelay,
  duration = ANIMATION_CONFIG.duration,
  once = ANIMATION_CONFIG.once,
  threshold = ANIMATION_CONFIG.threshold,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { 
    once, 
    amount: threshold 
  })

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={animationVariants[animation]}
      transition={{
        duration,
        delay,
        ease: ANIMATION_CONFIG.ease,
      }}
    >
      {children}
    </motion.div>
  )
}

interface StaggerContainerProps {
  children: ReactNode
  className?: string
  /** Delay between each child animation */
  staggerDelay?: number
  /** Base delay before first child animates */
  baseDelay?: number
  /** Whether animation should only play once */
  once?: boolean
}

/**
 * Container that staggers animations of its children
 */
export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
  baseDelay = 0,
  once = true,
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, amount: 0.2 })

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: baseDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Child item for use inside StaggerContainer
 */
export function StaggerItem({
  children,
  className,
  animation = 'fade-up',
}: {
  children: ReactNode
  className?: string
  animation?: keyof typeof animationVariants
}) {
  return (
    <motion.div
      className={cn(className)}
      variants={animationVariants[animation]}
      transition={{
        duration: ANIMATION_CONFIG.duration,
        ease: ANIMATION_CONFIG.ease,
      }}
    >
      {children}
    </motion.div>
  )
}

