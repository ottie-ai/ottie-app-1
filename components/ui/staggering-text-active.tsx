"use client"

import React from "react"
import { motion } from "framer-motion"

interface StaggeringTextActiveProps {
  children: string
  rotateX?: number
  stagger?: boolean
  className?: string
}

/**
 * Staggering text effect that continuously animates back and forth
 * Used for active status text - creates a pulsing/staggering effect
 * OPTIMIZED: Uses words instead of characters for better performance
 */
export function StaggeringTextActive({
  children,
  rotateX = 60,
  stagger = true,
  className,
}: StaggeringTextActiveProps) {
  const [hover, setHover] = React.useState(false)
  // Split by words instead of characters for better performance
  const words = children.split(" ")

  const target = {
    rotateX,
    y: -12,
    opacity: 0,
  }

  const transition = {
    type: "spring" as const,
    stiffness: 200,
    damping: 25,
  }

  // Auto-flip every 3.5 seconds (slower for less CPU usage)
  React.useEffect(() => {
    const interval = setInterval(() => {
      setHover((prev) => !prev)
    }, 3500)

    return () => clearInterval(interval)
  }, [])

  return (
    <span className="inline-block" aria-label={children} style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
      <div className="grid-stack" style={{ display: 'inline-grid', whiteSpace: 'nowrap', width: 'fit-content' }}>
        {/* Top layer */}
        <div className={className || "loading-text-home"} aria-hidden style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
          {words.map((word, index) => {
            let delay = hover
              ? index * 0.08
              : (words.length - 1 - index) * 0.08

            if (stagger === false) {
              delay = 0
            }

            return (
              <motion.span
                className="inline-block"
                animate={{
                  rotateX: hover ? target.rotateX : 0,
                  y: hover ? target.y : 0,
                  opacity: hover ? target.opacity : 1,
                }}
                key={`top-${index}-${children}`}
                style={{
                  transformStyle: "preserve-3d",
                  willChange: "transform, opacity",
                }}
                transition={{
                  delay,
                  ...transition,
                }}
              >
                {word}
                {index < words.length - 1 && '\u00A0'}
              </motion.span>
            )
          })}
        </div>
        
        {/* Bottom layer */}
        <div aria-hidden className={className || "loading-text-home"} style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
          {words.map((word, index) => {
            let delay = hover
              ? 0.1 + index * 0.08
              : (words.length - 1 - index) * 0.08

            if (stagger === false) {
              delay = 0
            }

            return (
              <motion.span
                className="inline-block"
                animate={{
                  rotateX: hover ? 0 : -60,
                  y: hover ? 0 : target.y * -1,
                  opacity: hover ? 1 : 0,
                }}
                key={`bottom-${index}-${children}`}
                style={{
                  transformStyle: "preserve-3d",
                  willChange: "transform, opacity",
                }}
                transition={{
                  ...transition,
                  delay,
                }}
              >
                {word}
                {index < words.length - 1 && '\u00A0'}
              </motion.span>
            )
          })}
        </div>
      </div>
    </span>
  )
}
