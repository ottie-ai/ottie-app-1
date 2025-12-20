/**
 * CursorManager - Singleton for managing multiple cursors efficiently
 * 
 * This ensures only one mousemove listener and one animation loop
 * is active, even when multiple cursor components are used on the page.
 */

import gsap from 'gsap'

interface CursorInstance {
  id: string
  element: HTMLElement
  innerElement: HTMLElement
  targetSelector?: string
  size: number
  expandedSize: number
  isExpanded: boolean
  currentPos: { x: number; y: number }
  shrinkTimeout?: NodeJS.Timeout
  onExpand?: () => void
  onShrink?: () => void
}

class CursorManager {
  private instances: Map<string, CursorInstance> = new Map()
  private targetPos = { x: 0, y: 0 }
  private rafId: number | null = null
  private isInitialized = false

  register(instance: Omit<CursorInstance, 'currentPos'>) {
    // Initialize position for this cursor
    const currentPos = typeof window !== 'undefined' 
      ? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      : { x: 0, y: 0 }
    
    const cursorInstance: CursorInstance = {
      ...instance,
      currentPos,
    }
    
    this.instances.set(instance.id, cursorInstance)
    
    // Setup hover listeners for this instance
    this.setupHoverListeners(cursorInstance)
    
    if (!this.isInitialized) {
      this.init()
    }
  }

  unregister(id: string) {
    const instance = this.instances.get(id)
    if (instance) {
      // Clear any pending timeouts
      if (instance.shrinkTimeout) {
        clearTimeout(instance.shrinkTimeout)
      }
      this.removeHoverListeners(instance)
      this.instances.delete(id)
    }
    
    if (this.instances.size === 0) {
      this.cleanup()
    }
  }

  private init() {
    if (this.isInitialized || typeof window === 'undefined') return
    
    this.isInitialized = true
    this.targetPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    
    // Single mousemove listener for all cursors
    document.addEventListener('mousemove', this.handleMouseMove)
    
    // Single animation loop for all cursors
    this.animate()
  }

  private handleMouseMove = (e: MouseEvent) => {
    this.targetPos = { x: e.clientX, y: e.clientY }
  }

  private setupHoverListeners(instance: CursorInstance) {
    if (!instance.targetSelector) return

    const targets = document.querySelectorAll(instance.targetSelector)
    
    targets.forEach((target) => {
      const enterHandler = () => {
        // Clear any pending shrink timeout
        if (instance.shrinkTimeout) {
          clearTimeout(instance.shrinkTimeout)
          instance.shrinkTimeout = undefined
        }
        
        if (!instance.isExpanded) {
          instance.isExpanded = true
          instance.onExpand?.()
        }
      }
      
      const leaveHandler = () => {
        if (instance.isExpanded) {
          // Add small delay before shrinking - allows moving between elements
          instance.shrinkTimeout = setTimeout(() => {
            instance.isExpanded = false
            instance.onShrink?.()
            instance.shrinkTimeout = undefined
          }, 50) // 50ms delay
        }
      }
      
      target.addEventListener('mouseenter', enterHandler)
      target.addEventListener('mouseleave', leaveHandler)
      
      // Store handlers for cleanup
      ;(target as any).__cursorHandlers = { enter: enterHandler, leave: leaveHandler }
    })
  }

  private removeHoverListeners(instance: CursorInstance) {
    if (!instance.targetSelector) return

    const targets = document.querySelectorAll(instance.targetSelector)
    
    targets.forEach((target) => {
      const handlers = (target as any).__cursorHandlers
      if (handlers) {
        target.removeEventListener('mouseenter', handlers.enter)
        target.removeEventListener('mouseleave', handlers.leave)
        delete (target as any).__cursorHandlers
      }
    })
  }

  private animate = () => {
    const lerp = 0.04
    
    // Update position for all cursors
    this.instances.forEach((instance) => {
      const dx = this.targetPos.x - instance.currentPos.x
      const dy = this.targetPos.y - instance.currentPos.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Lerp position
      instance.currentPos.x += dx * lerp
      instance.currentPos.y += dy * lerp
      
      // Apply position using left/top instead of x/y to avoid transform conflicts with parallax
      gsap.set(instance.element, {
        left: instance.currentPos.x,
        top: instance.currentPos.y,
      })
      
      // Calculate scale based on distance (spring effect)
      const maxDistance = 150
      const minScale = 0.6
      const scaleFromDistance = 1 - (Math.min(distance, maxDistance) / maxDistance) * (1 - minScale)
      
      // Apply scale to inner element
      gsap.set(instance.innerElement, {
        scale: scaleFromDistance,
      })
    })
    
    this.rafId = requestAnimationFrame(this.animate)
  }

  private cleanup() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    document.removeEventListener('mousemove', this.handleMouseMove)
    this.isInitialized = false
  }
}

// Singleton instance
export const cursorManager = new CursorManager()

