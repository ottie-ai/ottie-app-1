"use client"

import React from "react"
import { motion } from "framer-motion"

interface LoadingTextProps {
  text: string
  mode: 'blur-reveal' | 'stagger-active'
  loadingPhase?: 'waiting' | 'entering' | 'visible' | 'exiting' | 'hidden'
  rotateX?: number
  stagger?: boolean
  className?: string
}

/**
 * Unified loading text component that can switch between blur reveal and stagger effects
 * Uses the same element structure (letters) to prevent layout jumps
 */
export function LoadingText({
  text,
  mode,
  loadingPhase = 'visible',
  rotateX = 80,
  stagger = true,
  className = "loading-text-home",
}: LoadingTextProps) {
  const [hover, setHover] = React.useState(false)
  // Memoize chunks to prevent remounting during animation
  const chunks = React.useMemo(() => text.split(""), [text])
  
  // Auto-flip for stagger mode
  React.useEffect(() => {
    if (mode === 'stagger-active') {
      const interval = setInterval(() => {
        setHover((prev) => !prev)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [mode])

  // Blur reveal mode - letter by letter with blur animation
  if (mode === 'blur-reveal') {
    const isExiting = loadingPhase === 'exiting'
    const isHidden = loadingPhase === 'hidden'
    
    // Use a stable key based on loadingPhase to prevent remounting during animation
    const stableKey = `${loadingPhase}-${text.length}`
    
    return (
      <span className={className} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
        {chunks.map((letter, index) => {
          const delay = isExiting
            ? (chunks.length - 1 - index) * 0.04
            : index * 0.05
          
          return (
            <span
              key={`${stableKey}-${index}`}
              className={`loading-word-home ${isExiting ? 'exiting' : ''} ${isHidden ? 'opacity-0' : ''}`}
              style={{
                animationDelay: `${delay}s`,
                display: 'inline-block',
                ...(letter === " " && {
                  display: "inline",
                }),
              }}
            >
              {letter}
            </span>
          )
        })}
      </span>
    )
  }

  // Stagger active mode - letter by letter with stagger animation
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

  // Use a stable key based on text length to prevent remounting during animation
  const stableKey = `stagger-${text.length}`
  
  return (
    <span className="inline-block" aria-label={text} style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
      <div className={`${className} grid-stack`} style={{ display: 'inline-grid', whiteSpace: 'nowrap', width: 'fit-content' }}>
        {/* Top layer */}
        <div className={className} aria-hidden style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
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
                initial={{
                  rotateX: 0,
                  y: 0,
                  filter: "blur(0px)",
                  opacity: 1,
                }}
                animate={{
                  rotateX: hover ? target.rotateX : 0,
                  y: hover ? target.y : 0,
                  filter: hover ? target.filter : "blur(0px)",
                  opacity: hover ? 0 : 1,
                }}
                key={`${stableKey}-top-${index}`}
                style={{
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  willChange: "transform, opacity, filter",
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
        </div>
        
        {/* Bottom layer */}
        <div aria-hidden className={className} style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
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
                initial={{
                  rotateX: 270,
                  y: target.y * -1,
                  filter: target.filter,
                  opacity: 0,
                  visibility: "hidden" as const,
                }}
                animate={{
                  rotateX: hover ? 360 : 270,
                  y: hover ? 0 : target.y * -1,
                  filter: hover ? "blur(0px)" : target.filter,
                  opacity: hover ? 1 : 0,
                  visibility: hover ? ("visible" as const) : ("hidden" as const),
                }}
                key={`${stableKey}-bottom-${index}`}
                style={{
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  willChange: "transform, opacity, filter",
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
        </div>
      </div>
    </span>
  )
}
