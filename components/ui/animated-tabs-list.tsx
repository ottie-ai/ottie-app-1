'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import * as React from 'react'
import { TabsList, TabsTrigger } from './tabs'

interface AnimatedTabsListProps {
  children: React.ReactNode
  activeValue?: string
}

/**
 * Animated Tabs List with spring-based background indicator
 * - Active tab has a persistent background that animates between tabs
 * - Hover shows a separate indicator that appears on top
 * - Both use framer-motion spring animations for smooth transitions
 */
export function AnimatedTabsList({ children, activeValue }: AnimatedTabsListProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [hoverIndicator, setHoverIndicator] = useState<{ left: number; width: number; opacity: number }>({ 
    left: 0, 
    width: 0, 
    opacity: 0 
  })
  const [activeIndicator, setActiveIndicator] = useState<{ left: number; width: number }>({ 
    left: 0, 
    width: 0 
  })
  const [scaleX, setScaleX] = useState(1)
  const [originX, setOriginX] = useState(0.5)
  const tabsListRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevActiveValueRef = useRef<string | undefined>(undefined)
  const prevLeftRef = useRef<number>(0)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const isDark = mounted && resolvedTheme === 'dark'

  // Function to update active indicator - ONLY when activeValue changes (click)
  const updateActiveIndicator = React.useCallback(() => {
    if (!tabsListRef.current) return

    // Use requestAnimationFrame to wait for DOM update after Radix UI changes
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!tabsListRef.current) return

        // Find active tab by data-state="active" (Radix UI sets this)
        const activeTab = tabsListRef.current.querySelector(`[data-state="active"]`) as HTMLElement

        if (activeTab) {
          const list = tabsListRef.current
          const listRect = list.getBoundingClientRect()
          const tabRect = activeTab.getBoundingClientRect()
          
          const newLeft = tabRect.left - listRect.left
          const newWidth = tabRect.width
          const oldLeft = prevLeftRef.current
          
          // Determine direction of movement and create expansion effect
          if (oldLeft > 0 && newLeft !== oldLeft) {
            const direction = newLeft < oldLeft ? 'left' : 'right'
            
            // Set origin point for expansion
            setOriginX(direction === 'left' ? 1 : 0)
            
            // Expand first - stays expanded for a moment (like stretching a rubber band)
            setScaleX(1.18)
            
            // Then spring releases it to new position - shrink back during movement
            setTimeout(() => {
              setScaleX(1)
            }, 100)
          } else if (oldLeft === 0) {
            // First time - no expansion
            setScaleX(1)
            setOriginX(0.5)
          }
          
          prevLeftRef.current = newLeft
          
          setActiveIndicator({
            left: newLeft,
            width: newWidth,
          })
        }
      })
    })
  }, [])

  // Update active indicator ONLY when activeValue changes (user clicked a tab)
  useEffect(() => {
    if (!mounted) return
    
    // Only update if activeValue actually changed (click, not hover)
    if (prevActiveValueRef.current === activeValue) return
    
    prevActiveValueRef.current = activeValue
    
    // Small delay to ensure Radix UI has updated the DOM
    const timer = setTimeout(() => {
      updateActiveIndicator()
    }, 10)
    
    return () => clearTimeout(timer)
  }, [activeValue, mounted, updateActiveIndicator])

  // Initialize active indicator on mount
  useEffect(() => {
    if (!mounted) return
    
    // Wait for DOM to be ready
    const timer = setTimeout(() => {
      updateActiveIndicator()
    }, 50)
    
    return () => clearTimeout(timer)
  }, [mounted, updateActiveIndicator])


  // Update on window resize
  useEffect(() => {
    if (!mounted) return

    const handleResize = () => {
      updateActiveIndicator()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mounted, updateActiveIndicator])

  const updateHoverIndicator = (target: HTMLElement | null) => {
    if (!target || !tabsListRef.current) {
      setHoverIndicator(prev => ({ ...prev, opacity: 0 }))
      return
    }

    const list = tabsListRef.current
    const listRect = list.getBoundingClientRect()
    const tabRect = target.getBoundingClientRect()
    
    setHoverIndicator({
      left: tabRect.left - listRect.left,
      width: tabRect.width,
      opacity: 1,
    })
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    updateHoverIndicator(e.currentTarget)
  }

  const handleMouseLeave = () => {
    setHoverIndicator(prev => ({ ...prev, opacity: 0 }))
  }

  // Clone children and add handlers
  const childrenArray = React.Children.toArray(children)
  const enhancedChildren = React.Children.map(childrenArray, (child) => {
    if (React.isValidElement(child) && child.type === TabsTrigger) {
      return React.cloneElement(child as React.ReactElement, {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        className: `${child.props.className || ''} relative z-10 data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:border-transparent dark:data-[state=active]:border-transparent data-[state=active]:shadow-none`,
      })
    }
    return child
  })

  return (
    <div 
      ref={containerRef}
      className="relative"
      onMouseLeave={handleMouseLeave}
    >
      <div ref={tabsListRef}>
        <TabsList className="relative">
          {/* Active tab indicator - animated with spring (rendered first, higher z-index) */}
          {activeIndicator.width > 0 && (
            <motion.div
              className="absolute top-[3px] h-[calc(100%-6px)] rounded-md pointer-events-none bg-background dark:bg-background border border-transparent dark:border-input shadow-sm"
              initial={false}
              animate={{
                left: activeIndicator.left,
                width: activeIndicator.width,
                scaleX: scaleX,
              }}
              transition={{
                left: {
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                  mass: 0.6,
                },
                width: {
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                  mass: 0.6,
                },
                scaleX: {
                  type: 'spring',
                  stiffness: 800,
                  damping: 30,
                  mass: 0.3,
                },
              }}
              style={{
                zIndex: 2,
                transformOrigin: `${originX * 100}% center`,
              }}
            />
          )}
          
          {/* Hover indicator - appears below active (rendered second, lower z-index) */}
          <motion.div
            className="absolute top-[3px] h-[calc(100%-6px)] rounded-md pointer-events-none"
            animate={{
              left: hoverIndicator.left,
              width: hoverIndicator.width,
              opacity: hoverIndicator.opacity,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
              mass: 0.6,
            }}
            style={{
              zIndex: 1,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
            }}
          />
          
          {enhancedChildren}
        </TabsList>
      </div>
    </div>
  )
}
