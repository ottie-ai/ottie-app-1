'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface WordRevealProps {
  text: string
  className?: string
  delay?: number
  wordDelay?: number
  triggerOnScroll?: boolean
}

export function WordReveal({ 
  text, 
  className, 
  delay = 0,
  wordDelay = 0.05,
  triggerOnScroll = false
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
      { threshold: 0.2 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [triggerOnScroll])

  const words = text.split(' ')

  return (
    <span ref={ref} className={className}>
      {words.map((word, index) => (
        <span
          key={index}
          className={cn(
            'inline-block',
            isVisible ? 'animate-word-reveal' : 'opacity-0 blur-sm'
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

