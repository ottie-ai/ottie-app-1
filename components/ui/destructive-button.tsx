'use client'

import * as React from "react"
import { animate, useMotionTemplate, useMotionValue } from "framer-motion"
import { motion } from "framer-motion"
import { buttonVariants, type ButtonProps } from "./button"
import { cn } from "@/lib/utils"

const INITIAL_CLIP = 100

const springTransition = {
  type: "spring" as const,
  stiffness: 250,
  damping: 10,
}

export function DestructiveButton({
  className,
  size,
  onClick,
  children,
  ...props
}: Omit<ButtonProps, 'variant'>) {
  const clip = useMotionValue(INITIAL_CLIP)
  const [isConfirming, setIsConfirming] = React.useState(false)
  const confirmTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const animationRef = React.useRef<ReturnType<typeof animate> | null>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  const stopConfirm = React.useCallback(() => {
    setIsConfirming(false)
    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current)
      confirmTimeoutRef.current = null
    }
    // Stop current animation
    if (animationRef.current) {
      animationRef.current.stop()
      animationRef.current = null
    }
    // Reset with spring animation
    animate(clip, INITIAL_CLIP, {
      type: "spring",
      stiffness: 500,
      damping: 50,
    })
  }, [clip])

  // Hold to confirm logic
  const startConfirm = React.useCallback(() => {
    setIsConfirming(true)
    
    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop()
    }
    
    animationRef.current = animate(clip, 0, {
      ease: "linear",
      duration: 1,
    })
    
    // Auto-confirm after 1 second
    confirmTimeoutRef.current = setTimeout(() => {
      // Call onClick after hold confirmation
      if (onClick && buttonRef.current) {
        // Create a proper synthetic event
        const syntheticEvent = {
          preventDefault: () => {},
          stopPropagation: () => {},
          currentTarget: buttonRef.current,
          target: buttonRef.current,
          nativeEvent: new MouseEvent('click', { bubbles: true, cancelable: true }),
        } as unknown as React.MouseEvent<HTMLButtonElement>
        
        // Call onClick directly - this should work with AlertDialog
        onClick(syntheticEvent)
      }
      stopConfirm()
    }, 1000)
  }, [clip, onClick, stopConfirm])

  React.useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current)
      }
      if (animationRef.current) {
        animationRef.current.stop()
      }
    }
  }, [])

  const clipPath = useMotionTemplate`inset(0px ${clip}% 0px 0px round 6px)`

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    startConfirm()
    props.onPointerDown?.(e)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    stopConfirm()
    props.onPointerUp?.(e)
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    stopConfirm()
    props.onMouseLeave?.(e)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter") {
      startConfirm()
    }
    props.onKeyDown?.(e)
  }

  const handleKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter") {
      stopConfirm()
    }
    props.onKeyUp?.(e)
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent normal click - only allow after hold confirmation
    // But if we're in a confirming state and the timeout has completed, allow it
    if (!isConfirming) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const { onClick: _, ...restProps } = props as any

  return (
    <motion.button
      ref={buttonRef}
      data-slot="button"
      type="button"
      className={cn(buttonVariants({ variant: "destructive", size, className }), "relative overflow-hidden")}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={springTransition}
      {...restProps}
    >
      <span className="relative flex items-center justify-center gap-2 w-full z-10">
        {children}
      </span>
      <motion.div
        aria-hidden
        className="absolute left-0 top-0 pointer-events-none w-full h-full flex items-center justify-center gap-2 bg-destructive text-destructive-foreground rounded-md"
        style={{ clipPath }}
      >
        {children}
      </motion.div>
    </motion.button>
  )
}
