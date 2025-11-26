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

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
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
      }}
    >
      {children}
    </div>
  )
}
