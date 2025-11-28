'use client'

import * as React from 'react'
import { useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface GlowCardProps extends React.ComponentProps<typeof Card> {
  children: React.ReactNode
  className?: string
  glowClassName?: string
  initialGlow?: boolean
}

const GlowCard = React.forwardRef<HTMLDivElement, GlowCardProps>(
  ({ children, className, glowClassName, initialGlow = false, ...props }, ref) => {
    const cardRef = useRef<HTMLDivElement>(null)
    const [isHovered, setIsHovered] = useState(false)

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current
      if (!card) return

      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      // Calculate angle from center to pointer
      const dx = x - centerX
      const dy = y - centerY
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90
      if (angle < 0) angle += 360

      // Calculate distance from edge (0 = center, 1 = edge)
      const kX = dx !== 0 ? centerX / Math.abs(dx) : Infinity
      const kY = dy !== 0 ? centerY / Math.abs(dy) : Infinity
      const edgeCloseness = Math.min(Math.max(1 / Math.min(kX, kY), 0), 1)

      card.style.setProperty('--pointer-x', `${(x / rect.width) * 100}%`)
      card.style.setProperty('--pointer-y', `${(y / rect.height) * 100}%`)
      card.style.setProperty('--pointer-angle', `${angle}deg`)
      card.style.setProperty('--pointer-edge', `${edgeCloseness}`)
    }, [])

    const handleMouseEnter = useCallback(() => {
      const card = cardRef.current
      if (!card) return
      
      // Set initial position to bottom center
      if (initialGlow) {
        card.style.setProperty('--pointer-x', '50%')
        card.style.setProperty('--pointer-y', '100%')
        card.style.setProperty('--pointer-angle', '180deg')
        card.style.setProperty('--pointer-edge', '1')
      }
      
      setIsHovered(true)
    }, [initialGlow])

    const handleMouseLeave = useCallback(() => {
      setIsHovered(false)
    }, [])

    return (
      <Card
        ref={cardRef}
        className={cn('glow-card !p-0 !gap-0', className)}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-hovered={isHovered ? "true" : undefined}
        {...props}
      >
        <span className={cn('glow-card-glow', glowClassName)} />
        <div className="glow-card-border" />
        {children}
      </Card>
    )
  }
)
GlowCard.displayName = 'GlowCard'

export { GlowCard }
