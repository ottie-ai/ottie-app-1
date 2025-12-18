'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import * as React from 'react'
import { SidebarMenu, SidebarMenuButton } from './sidebar'

interface AnimatedSidebarMenuProps {
  children: React.ReactNode
  activePath?: string
}

/**
 * Animated Sidebar Menu with spring-based background indicator
 * - Active item has a persistent background that animates between items
 * - Hover shows a separate indicator that appears on top
 * - Both use framer-motion spring animations for smooth transitions
 */
export function AnimatedSidebarMenu({ children, activePath }: AnimatedSidebarMenuProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [hoverIndicator, setHoverIndicator] = useState<{ top: number; height: number; opacity: number }>({ 
    top: 0, 
    height: 0, 
    opacity: 0 
  })
  const [activeIndicator, setActiveIndicator] = useState<{ top: number; height: number }>({ 
    top: 0, 
    height: 0 
  })
  const [scaleY, setScaleY] = useState(1)
  const [originY, setOriginY] = useState(0.5)
  const menuRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevActivePathRef = useRef<string | undefined>(undefined)
  const prevTopRef = useRef<number>(0)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const isDark = mounted && resolvedTheme === 'dark'

  // Function to update active indicator - ONLY when activePath changes
  const updateActiveIndicator = React.useCallback(() => {
    if (!menuRef.current) return

    // Use requestAnimationFrame to wait for DOM update
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!menuRef.current) return

        // Find active item by data-active="true"
        // Also check for popover-trigger wrapped buttons
        const activeItem = menuRef.current.querySelector(`[data-active="true"][data-slot="sidebar-menu-button"], [data-active="true"][data-slot="popover-trigger"][data-sidebar="menu-button"]`) as HTMLElement

        if (activeItem) {
          const menu = menuRef.current
          const menuRect = menu.getBoundingClientRect()
          const itemRect = activeItem.getBoundingClientRect()
          
          const newTop = itemRect.top - menuRect.top
          const newHeight = itemRect.height
          const oldTop = prevTopRef.current
          
          // Determine direction of movement and create expansion effect
          if (oldTop > 0 && newTop !== oldTop) {
            const direction = newTop < oldTop ? 'up' : 'down'
            
            // Set origin point for expansion
            setOriginY(direction === 'up' ? 1 : 0)
            
            // Expand first - stays expanded for a moment
            setScaleY(1.18)
            
            // Then spring releases it to new position - shrink back during movement
            setTimeout(() => {
              setScaleY(1)
            }, 100)
          } else if (oldTop === 0) {
            // First time - no expansion
            setScaleY(1)
            setOriginY(0.5)
          }
          
          prevTopRef.current = newTop
          
          setActiveIndicator({
            top: newTop,
            height: newHeight,
          })
        }
      })
    })
  }, [])

  // Update active indicator ONLY when activePath changes
  useEffect(() => {
    if (!mounted) return
    
    // Only update if activePath actually changed
    if (prevActivePathRef.current === activePath) return
    
    prevActivePathRef.current = activePath
    
    // Small delay to ensure DOM has updated
    const timer = setTimeout(() => {
      updateActiveIndicator()
    }, 10)
    
    return () => clearTimeout(timer)
  }, [activePath, mounted, updateActiveIndicator])

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
    if (!target || !menuRef.current) {
      setHoverIndicator(prev => ({ ...prev, opacity: 0 }))
      return
    }

    const menu = menuRef.current
    const menuRect = menu.getBoundingClientRect()
    const itemRect = target.getBoundingClientRect()
    
    setHoverIndicator({
      top: itemRect.top - menuRect.top,
      height: itemRect.height,
      opacity: 1,
    })
  }


  // Use event delegation instead of cloning
  useEffect(() => {
    if (!menuRef.current) return

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Check if target is inside a SidebarMenuButton (could be wrapped in PopoverTrigger)
      // PopoverTrigger changes data-slot to "popover-trigger", so we need to check both
      const button = target.closest('[data-slot="sidebar-menu-button"], [data-slot="popover-trigger"][data-sidebar="menu-button"]') as HTMLElement
      if (button) {
        updateHoverIndicator(button)
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Check if target is inside a SidebarMenuButton (could be wrapped in PopoverTrigger)
      const button = target.closest('[data-slot="sidebar-menu-button"], [data-slot="popover-trigger"][data-sidebar="menu-button"]') as HTMLElement
      if (button) {
        updateHoverIndicator(button)
      }
    }

    const handleMouseLeave = () => {
      setHoverIndicator(prev => ({ ...prev, opacity: 0 }))
    }

    const menu = menuRef.current
    // Use both mouseenter and mousemove to catch events that might be blocked
    menu.addEventListener('mouseenter', handleMouseEnter as EventListener, true)
    menu.addEventListener('mousemove', handleMouseMove as EventListener, true)
    menu.addEventListener('mouseleave', handleMouseLeave)
    
    // Also listen for mouse events on all buttons directly (for PopoverTrigger compatibility)
    // PopoverTrigger changes data-slot to "popover-trigger", so we need to check both
    const buttons = menu.querySelectorAll('[data-slot="sidebar-menu-button"], [data-slot="popover-trigger"][data-sidebar="menu-button"]')
    const buttonHandlers = Array.from(buttons).map((button) => {
      const handleButtonMouseEnter = () => {
        updateHoverIndicator(button as HTMLElement)
      }
      button.addEventListener('mouseenter', handleButtonMouseEnter)
      return { button, handler: handleButtonMouseEnter }
    })

    return () => {
      menu.removeEventListener('mouseenter', handleMouseEnter as EventListener, true)
      menu.removeEventListener('mousemove', handleMouseMove as EventListener, true)
      menu.removeEventListener('mouseleave', handleMouseLeave)
      buttonHandlers.forEach(({ button, handler }) => {
        button.removeEventListener('mouseenter', handler)
      })
    }
  }, [mounted, updateHoverIndicator])

  return (
    <div 
      ref={containerRef}
      className="relative"
      onMouseLeave={() => setHoverIndicator(prev => ({ ...prev, opacity: 0 }))}
    >
      <SidebarMenu ref={menuRef} className="relative">
        {/* Active item indicator - animated with spring (behind content) */}
        {activeIndicator.height > 0 && (
          <motion.div
            className="absolute left-[3px] w-[calc(100%-6px)] rounded-full pointer-events-none bg-black dark:bg-white shadow-sm"
            initial={false}
            animate={{
              top: activeIndicator.top,
              height: activeIndicator.height,
              scaleY: scaleY,
            }}
            transition={{
              top: {
                type: 'spring',
                stiffness: 400,
                damping: 25,
                mass: 0.6,
              },
              height: {
                type: 'spring',
                stiffness: 400,
                damping: 25,
                mass: 0.6,
              },
              scaleY: {
                type: 'spring',
                stiffness: 800,
                damping: 30,
                mass: 0.3,
              },
            }}
            style={{
              zIndex: 0,
              transformOrigin: `center ${originY * 100}%`,
            }}
          />
        )}
        
        {/* Hover indicator - behind active and content */}
        <motion.div
          className="absolute left-[3px] w-[calc(100%-6px)] rounded-full pointer-events-none"
          animate={{
            top: hoverIndicator.top,
            height: hoverIndicator.height,
            opacity: hoverIndicator.opacity,
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
            mass: 0.6,
          }}
          style={{
            zIndex: 0,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          }}
        />
        
        {children}
      </SidebarMenu>
    </div>
  )
}


