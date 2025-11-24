'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface WordRevealProps {
  text: string
  className?: string
  delay?: number
  wordDelay?: number
  as?: keyof JSX.IntrinsicElements
}

export function WordReveal({ 
  text, 
  className, 
  delay = 0,
  wordDelay = 0.05,
  as: Component = 'span'
}: WordRevealProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const words = text.split(' ')

  return (
    <Component className={className}>
      {words.map((word, index) => (
        <span
          key={index}
          className={cn(
            'inline-block',
            mounted ? 'animate-word-reveal' : 'opacity-0 blur-sm'
          )}
          style={{
            animationDelay: `${delay + index * wordDelay}s`,
          }}
        >
          {word}
          {index < words.length - 1 && '\u00A0'}
        </span>
      ))}
    </Component>
  )
}

