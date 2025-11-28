'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ANIMATION_CONFIG } from './animate-on-scroll'

interface WordRevealProps {
  text: string
  className?: string
  /** Delay before animation starts (in seconds) */
  delay?: number
  /** Delay between each word (in seconds) - defaults to global config */
  wordDelay?: number
  /** Whether to trigger animation on scroll into view */
  triggerOnScroll?: boolean
  /** Threshold for scroll trigger (0-1) */
  threshold?: number
}

/**
 * Word-by-word reveal animation
 * Uses global animation config for consistent timing across the app
 */
export function WordReveal({ 
  text, 
  className, 
  delay = ANIMATION_CONFIG.baseDelay,
  wordDelay = ANIMATION_CONFIG.wordDelay,
  triggerOnScroll = false,
  threshold = ANIMATION_CONFIG.threshold,
}: WordRevealProps) {
  const [isVisible, setIsVisible] = useState(!triggerOnScroll)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!triggerOnScroll) {
      setIsVisible(true)
      return
    }

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
  }, [triggerOnScroll, threshold])

  const words = text.split(' ')

  return (
    <span ref={ref} className={className}>
      {words.map((word, index) => (
        <span
          key={index}
          className={cn(
            'inline-block',
            isVisible ? 'animate-word-reveal' : 'opacity-0'
          )}
          style={{
            animationDelay: `${delay + index * wordDelay}s`,
          }}
        >
          {word}
          {index < words.length - 1 && '\u00A0'}
        </span>
      ))}
    </span>
  )
}
