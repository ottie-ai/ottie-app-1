'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Play } from '@phosphor-icons/react'
import gsap from 'gsap'
import { cursorManager } from './cursor-manager'

export interface PlayCursorProps {
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
   * Background color when expanded (default: "rgba(255, 255, 255, 0.1)")
   */
  expandedBgColor?: string
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
 * PlayCursor - Play cursor with spring/elastic follow effect
 * 
 * The cursor follows the mouse with a delay and has a spring effect.
 * Shows play icon when expanded.
 */
export function PlayCursor({
  targetSelector,
  size = 20,
  expandedSize = 120,
  expandedBgColor = 'rgba(255, 255, 255, 0.1)',
  enabled = true,
  className = '',
}: PlayCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null)
  const cursorInnerRef = useRef<HTMLDivElement>(null)
  const isExpandedRef = useRef(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const instanceIdRef = useRef(`play-cursor-${Math.random().toString(36).substr(2, 9)}`)

  // Mount portal after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !mounted) return

    const cursor = cursorRef.current
    const cursorInner = cursorInnerRef.current
    if (!cursor || !cursorInner) return

    // Initialize
    gsap.set(cursorInner, { opacity: 0, width: size, height: size })

    const expandCursor = () => {
      isExpandedRef.current = true
      setIsExpanded(true)
      gsap.to(cursorInner, {
        width: expandedSize,
        height: expandedSize,
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const shrinkCursor = () => {
      isExpandedRef.current = false
      setIsExpanded(false)
      gsap.to(cursorInner, {
        width: size,
        height: size,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.out',
      })
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
  }, [enabled, targetSelector, size, expandedSize, mounted])

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
      {/* Inner cursor element that scales */}
      <div
        ref={cursorInnerRef}
        className="flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          backdropFilter: 'blur(10px)',
          backgroundColor: expandedBgColor,
          willChange: 'transform, width, height, opacity',
        }}
      >
        {/* Play icon */}
        <Play weight="light" size={isExpanded ? 30 : 16} color="white" />
      </div>
    </div>,
    document.body
  )
}

