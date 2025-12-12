"use client"

import React from "react"
import { AnimatePresence, motion } from "framer-motion"

interface StaggeringTextActiveProps {
  children: string
  rotateX?: number
  stagger?: boolean
  className?: string
}

/**
 * Staggering text effect that continuously animates back and forth
 * Used for active status text - creates a pulsing/staggering effect
 */
export function StaggeringTextActive({
  children,
  rotateX = 80,
  stagger = true,
  className,
}: StaggeringTextActiveProps) {
  const [hover, setHover] = React.useState(false)
  const chunks = children.split("")

  const target = {
    rotateX,
    y: -16,
    filter: "blur(4px)",
  }

  const transition = {
    type: "spring" as const,
    stiffness: 250,
    damping: 30,
  }

  // Auto-flip every 2 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setHover((prev) => !prev)
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <span className="inline-block" aria-label={children} style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
      <div className="grid-stack" style={{ display: 'inline-grid', whiteSpace: 'nowrap', width: 'fit-content' }}>
        {/* Top layer */}
        <div className={className || "loading-text-home"} aria-hidden style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
          <AnimatePresence initial={false}>
            {chunks.map((letter, index) => {
              let delay = hover
                ? index * 0.05
                : (chunks.length - 1 - index) * 0.06

              if (stagger === false) {
                delay = 0
              }

              return (
                <motion.span
                  className="inline-block"
                  animate={{
                    rotateX: hover ? target.rotateX : 0,
                    y: hover ? target.y : 0,
                    filter: hover ? target.filter : "blur(0px)",
                    opacity: hover ? 0 : 1,
                  }}
                  key={`top-${index}-${children}`}
                  style={{
                    transformStyle: "preserve-3d",
                    ...(letter === " " && {
                      display: "inline",
                    }),
                  }}
                  transition={{
                    delay,
                    ...transition,
                  }}
                >
                  {letter}
                </motion.span>
              )
            })}
          </AnimatePresence>
        </div>
        
        {/* Bottom layer */}
        <div aria-hidden className={className || "loading-text-home"} style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
          <AnimatePresence initial={false}>
            {chunks.map((letter, index) => {
              let delay = hover
                ? 0.1 + index * 0.05
                : (chunks.length - 1 - index) * 0.05

              if (stagger === false) {
                delay = 0
              }

              return (
                <motion.span
                  className="inline-block"
                  animate={{
                    rotateX: hover ? 360 : 270,
                    y: hover ? 0 : target.y * -1,
                    filter: hover ? "blur(0px)" : target.filter,
                    opacity: hover ? 1 : 0,
                  }}
                  key={`bottom-${index}-${children}`}
                  style={{
                    transformStyle: "preserve-3d",
                    ...(letter === " " && {
                      display: "inline",
                    }),
                  }}
                  transition={{
                    ...transition,
                    delay,
                  }}
                >
                  {letter}
                </motion.span>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </span>
  )
}
