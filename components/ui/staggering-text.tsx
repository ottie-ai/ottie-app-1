"use client"

import React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"

const defaultTextStyle = "text-5xl max-sm:text-3xl [&>span]:inline-block -tracking-[1px]"

interface StaggeringTextTransitionProps {
  /** Current text to display */
  currentText: string
  /** Previous text (shown during transition, then replaced) */
  previousText?: string
  /** When true, animates from previousText to currentText */
  isTransitioning: boolean
  rotateX?: number
  stagger?: boolean
  className?: string
  onTransitionComplete?: () => void
}

/**
 * Staggering text transition effect
 * 
 * Shows two texts overlaid - when isTransitioning=true:
 * - First div (previousText) rotates UP and fades out
 * - Second div (currentText) rotates IN from below
 * 
 * This creates the effect of text "flipping" to reveal new text
 */
export function StaggeringTextTransition({
  currentText,
  previousText,
  isTransitioning,
  rotateX = 80,
  stagger = true,
  className = defaultTextStyle,
  onTransitionComplete,
}: StaggeringTextTransitionProps) {
  // Use previousText during transition, otherwise show currentText in both layers
  const topLayerText = isTransitioning && previousText ? previousText : currentText
  const bottomLayerText = currentText
  
  const topChunks = topLayerText.split("")
  const bottomChunks = bottomLayerText.split("")

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

  // Track animation completion
  const completedRef = React.useRef(false)
  
  React.useEffect(() => {
    completedRef.current = false
  }, [currentText, isTransitioning])

  return (
    <div className="w-fit grid-stack" aria-label={currentText}>
      {/* Top layer - visible when NOT transitioning, exits when transitioning */}
      <div className={cn(className)} aria-hidden>
        <AnimatePresence initial={false}>
          {topChunks.map((letter, index) => {
            // When transitioning: stagger exit from first to last
            // When not transitioning: stagger entrance from last to first
            let delay = isTransitioning
              ? index * 0.05
              : (topChunks.length - 1 - index) * 0.06

            if (stagger === false) {
              delay = 0
            }

            return (
              <motion.span
                className="inline-block"
                animate={{
                  rotateX: isTransitioning ? target.rotateX : 0,
                  y: isTransitioning ? target.y : 0,
                  filter: isTransitioning ? target.filter : "blur(0px)",
                  opacity: isTransitioning ? 0 : 1,
                }}
                key={`top-${index}-${topLayerText}`}
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
      
      {/* Bottom layer - hidden when NOT transitioning, enters when transitioning */}
      <div aria-hidden className={cn(className)}>
        <AnimatePresence initial={false}>
          {bottomChunks.map((letter, index) => {
            // When transitioning: stagger entrance from first to last (with delay)
            // When not transitioning: stagger exit from last to first
            let delay = isTransitioning
              ? 0.1 + index * 0.05
              : (bottomChunks.length - 1 - index) * 0.05

            if (stagger === false) {
              delay = 0
            }

            return (
              <motion.span
                className="inline-block"
                animate={{
                  rotateX: isTransitioning ? 360 : 270,
                  y: isTransitioning ? 0 : target.y * -1,
                  filter: isTransitioning ? "blur(0px)" : target.filter,
                  opacity: isTransitioning ? 1 : 0,
                }}
                key={`bottom-${index}-${bottomLayerText}`}
                style={{
                  transformStyle: "preserve-3d",
                  ...(letter === " " && {
                    display: "inline",
                  }),
                }}
                onAnimationComplete={() => {
                  // Call onTransitionComplete when last letter finishes
                  if (index === bottomChunks.length - 1 && isTransitioning && !completedRef.current) {
                    completedRef.current = true
                    onTransitionComplete?.()
                  }
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
  )
}
