'use client'

import { useEffect, useState, useRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ANIMATION_CONFIG } from './animate-on-scroll'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  /** Delay before animation starts (in seconds) */
  delay?: number
  /** Threshold for scroll trigger (0-1) */
  threshold?: number
}

/**
 * Simple scroll-triggered reveal animation
 * Uses global animation config for consistent timing across the app
 * 
 * @deprecated Use AnimateOnScroll instead for more flexibility
 */
export function ScrollReveal({ 
  children, 
  className,
  delay = ANIMATION_CONFIG.baseDelay,
  threshold = ANIMATION_CONFIG.threshold,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    // Only create observer once
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observerRef.current?.disconnect()
          }
        },
        { 
          threshold,
          rootMargin: '50px' // Trigger earlier
        }
      )
    }

    const element = ref.current
    if (element && observerRef.current) {
      observerRef.current.observe(element)
    }

    return () => {
      if (element && observerRef.current) {
        observerRef.current.unobserve(element)
      }
    }
  }, [threshold])

  return (
    <div 
      ref={ref}
      className={cn(
        'transition-all ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
      style={{
        transitionDelay: `${delay}s`,
        transitionDuration: `${ANIMATION_CONFIG.duration}s`,
        willChange: isVisible ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}
