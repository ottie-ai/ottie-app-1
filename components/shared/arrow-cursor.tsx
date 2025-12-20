'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight } from '@phosphor-icons/react'
import gsap from 'gsap'
import { cursorManager } from './cursor-manager'

export interface ArrowCursorProps {
  /**
   * Selector for elements that should trigger cursor expansion
   */
  targetSelector?: string
  /**
   * Size of cursor in normal state (default: 20)
   */
  size?: number
  /**
   * Size of cursor when expanded (default: 120)
   */
  expandedSize?: number
  /**
   * Border color (default: "rgba(255, 255, 255, 1)")
   */
  borderColor?: string
  /**
   * Enable/disable the cursor (default: true)
   */
  enabled?: boolean
  /**
   * Custom className for the cursor element
   */
  className?: string
}

/**
 * ArrowCursor - Arrow cursor with border and spring/elastic follow effect
 * 
 * The cursor follows the mouse with a delay and has a spring effect.
 * Shows arrow icon inside a bordered circle when expanded.
 * Border draws clockwise like a clock hand.
 */
export function ArrowCursor({
  targetSelector,
  size = 20,
  expandedSize = 120,
  borderColor = 'rgba(255, 255, 255, 1)',
  enabled = true,
  className = '',
}: ArrowCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null)
  const cursorInnerRef = useRef<HTMLDivElement>(null)
  const cursorIconRef = useRef<HTMLDivElement>(null)
  const circlePathRef = useRef<SVGCircleElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const isExpandedRef = useRef(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const instanceIdRef = useRef(`arrow-cursor-${Math.random().toString(36).substr(2, 9)}`)

  // Calculate circumference
  const radius = expandedSize / 2 - 1
  const circumference = 2 * Math.PI * radius

  // Mount portal after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !mounted) return

    const cursor = cursorRef.current
    const cursorInner = cursorInnerRef.current
    const cursorIcon = cursorIconRef.current
    const circlePath = circlePathRef.current
    const svg = svgRef.current
    if (!cursor || !cursorInner || !cursorIcon || !circlePath || !svg) return

    // Initialize - hidden
    gsap.set(cursorInner, { opacity: 0 })
    gsap.set(cursorIcon, { opacity: 0, scale: 0.5 })
    gsap.set(circlePath, { strokeDashoffset: circumference })

    const expandCursor = () => {
      isExpandedRef.current = true
      setIsExpanded(true)
      
      // Reset all transforms and opacity
      gsap.set(cursorInner, { opacity: 1, scale: 1 })
      gsap.set(svg, { opacity: 1, scale: 1 })
      gsap.set(cursorIcon, { opacity: 0, scale: 0.5 })
      
      // Reset circle to start position
      gsap.set(circlePath, { strokeDashoffset: circumference })
      
      // Draw circle clockwise (stroke-dashoffset from full to 0)
      // Start immediately, longer duration to see the animation
      gsap.to(circlePath, {
        strokeDashoffset: 0,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0, // No delay - start immediately
      })
      
      // Icon - reveal effect after circle starts drawing
      gsap.to(cursorIcon, {
        opacity: 1,
        scale: 1,
        duration: 0.4,
        ease: 'back.out(1.2)',
        delay: 0.4, // Show icon halfway through circle animation
      })
    }

    const shrinkCursor = () => {
      isExpandedRef.current = false
      setIsExpanded(false)
      
      // Shrink cursor to nothing (scale + opacity) - animate all together
      gsap.to([cursorInner, svg, cursorIcon], {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
      })
      
      // Reset circle stroke after animation (delayed)
      setTimeout(() => {
        gsap.set(circlePath, {
          strokeDashoffset: circumference,
        })
      }, 300)
    }

    // Register with cursor manager
    cursorManager.register({
      id: instanceIdRef.current,
      element: cursor,
      innerElement: cursorInner,
      targetSelector,
      size,
      expandedSize,
      isExpanded: false,
      onExpand: expandCursor,
      onShrink: shrinkCursor,
    })

    // Cleanup
    return () => {
      cursorManager.unregister(instanceIdRef.current)
    }
  }, [enabled, targetSelector, size, expandedSize, circumference, mounted])

  if (!enabled || !mounted) return null

  // Use portal to render cursor at document.body level, avoiding transform context issues
  return createPortal(
    <div
      ref={cursorRef}
      className={`fixed pointer-events-none z-[9999] ${className}`}
      style={{
        left: 0,
        top: 0,
        transform: 'translate(-50%, -50%)',
        willChange: 'left, top',
      }}
    >
      {/* Inner cursor element - fixed expanded size */}
      <div
        ref={cursorInnerRef}
        className="relative"
        style={{
          width: expandedSize,
          height: expandedSize,
          willChange: 'opacity, transform',
        }}
      >
        {/* SVG circle that draws clockwise */}
        <svg
          ref={svgRef}
          width={expandedSize}
          height={expandedSize}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: 'rotate(-90deg)', // Start from top (12 o'clock)
            transformOrigin: 'center',
            willChange: 'transform, opacity',
          }}
        >
          <circle
            ref={circlePathRef}
            cx={expandedSize / 2}
            cy={expandedSize / 2}
            r={radius}
            fill="none"
            stroke={borderColor}
            strokeWidth="1"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            style={{
              willChange: 'stroke-dashoffset',
            }}
          />
        </svg>
        
        {/* Arrow icon - with reveal effect */}
        <div
          ref={cursorIconRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            willChange: 'transform, opacity',
          }}
        >
          <ArrowUpRight weight="light" size={isExpanded ? 30 : 16} color="white" />
        </div>
      </div>
    </div>,
    document.body
  )
}

