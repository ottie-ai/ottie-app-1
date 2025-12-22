'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Play, ArrowUpRight, type Icon } from '@phosphor-icons/react'
import gsap from 'gsap'
import { cursorManager } from './cursor-manager'
import type { ThemeConfig } from '@/types/builder'

export type CursorStyle = 'none' | 'frosty' | 'circle'
export type CursorIconType = 'play' | 'arrow' | React.ComponentType<{ weight?: string; size?: number; color?: string }>

export interface CustomCursorProps {
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
   * Background color when expanded for frosty style (default: "rgba(255, 255, 255, 0.1)")
   */
  expandedBgColor?: string
  /**
   * Border color for circle style (default: "rgba(255, 255, 255, 1)")
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
  /**
   * Theme config to get cursor style from
   */
  theme?: ThemeConfig
  /**
   * Icon to display - can be 'play', 'arrow', or a custom icon component
   * Defaults to 'play' for frosty style, 'arrow' for circle style
   */
  icon?: CursorIconType
}

/**
 * CustomCursor - Unified cursor component supporting frosty and circle styles
 * 
 * The cursor follows the mouse with a delay and has a spring effect.
 * Style is determined by theme.cursorStyle or can be overridden.
 * Icons can be customized per section but default to play (frosty) or arrow (circle).
 */
export function CustomCursor({
  targetSelector,
  size = 20,
  expandedSize = 120,
  expandedBgColor = 'rgba(255, 255, 255, 0.1)',
  borderColor = 'rgba(255, 255, 255, 1)',
  enabled = true,
  className = '',
  theme,
  icon,
}: CustomCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null)
  const cursorInnerRef = useRef<HTMLDivElement>(null)
  const cursorIconRef = useRef<HTMLDivElement>(null)
  const circlePathRef = useRef<SVGCircleElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const isExpandedRef = useRef(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const instanceIdRef = useRef(`custom-cursor-${Math.random().toString(36).substr(2, 9)}`)

  // Determine cursor style from theme or default to 'frosty'
  const cursorStyle: CursorStyle = theme?.cursorStyle || 'frosty'
  
  // Determine icon - use provided icon, or default based on style
  const iconType: CursorIconType = icon || (cursorStyle === 'circle' ? 'arrow' : 'play')
  
  // Don't render if disabled or style is 'none'
  const shouldRender = enabled && cursorStyle !== 'none' && mounted

  // Calculate circumference for circle style
  const radius = expandedSize / 2 - 1
  const circumference = 2 * Math.PI * radius

  // Mount portal after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Render icon component
  const renderIcon = () => {
    const iconSize = isExpanded ? 30 : 16
    const iconColor = 'white'
    
    if (iconType === 'play') {
      return <Play weight="light" size={iconSize} color={iconColor} />
    } else if (iconType === 'arrow') {
      return <ArrowUpRight weight="light" size={iconSize} color={iconColor} />
    } else if (typeof iconType === 'function' || (typeof iconType === 'object' && 'render' in iconType)) {
      // Custom icon component
      const IconComponent = iconType as React.ComponentType<{ weight?: string; size?: number; color?: string }>
      return <IconComponent weight="light" size={iconSize} color={iconColor} />
    }
    return null
  }

  useEffect(() => {
    if (!shouldRender || typeof window === 'undefined') return

    const cursor = cursorRef.current
    const cursorInner = cursorInnerRef.current
    const cursorIcon = cursorIconRef.current
    const circlePath = circlePathRef.current
    const svg = svgRef.current
    if (!cursor || !cursorInner) return

    if (cursorStyle === 'frosty') {
      // Frosty style - scales up with blur background
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
    } else if (cursorStyle === 'circle') {
      // Circle style - fixed size with animated border
      if (!cursorIcon || !circlePath || !svg) return

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
        gsap.to(circlePath, {
          strokeDashoffset: 0,
          duration: 0.8,
          ease: 'power2.out',
          delay: 0,
        })
        
        // Icon - reveal effect after circle starts drawing
        gsap.to(cursorIcon, {
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: 'back.out(1.2)',
          delay: 0.4,
        })
      }

      const shrinkCursor = () => {
        isExpandedRef.current = false
        setIsExpanded(false)
        
        // Shrink cursor to nothing
        gsap.to([cursorInner, svg, cursorIcon], {
          scale: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
        })
        
        // Reset circle stroke after animation
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
    }

    // Cleanup
    return () => {
      cursorManager.unregister(instanceIdRef.current)
    }
  }, [shouldRender, targetSelector, size, expandedSize, cursorStyle, circumference])

  if (!shouldRender) return null

  // Use portal to render cursor at document.body level
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
      {cursorStyle === 'frosty' ? (
        // Frosty style - scales up with blur background
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
          {renderIcon()}
        </div>
      ) : cursorStyle === 'circle' ? (
        // Circle style - fixed size with animated border
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
          
          {/* Icon - with reveal effect */}
          <div
            ref={cursorIconRef}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              willChange: 'transform, opacity',
            }}
          >
            {renderIcon()}
          </div>
        </div>
      ) : null}
    </div>,
    document.body
  )
}
