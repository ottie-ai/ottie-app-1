'use client'

import { useEffect, useRef, MutableRefObject } from 'react'

interface UseMagneticOptions {
  distance?: number // Distance in pixels to activate magnetic effect
  strength?: number // Strength of the magnetic pull (0-1)
}

export function useMagnetic<T extends HTMLElement = HTMLButtonElement>(
  options: UseMagneticOptions = {}
): MutableRefObject<T | null> {
  const { distance = 100, strength = 0.3 } = options
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let animationFrameId: number | null = null
    let currentX = 0
    let currentY = 0
    let targetX = 0
    let targetY = 0

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const mouseX = e.clientX
      const mouseY = e.clientY

      const deltaX = mouseX - centerX
      const deltaY = mouseY - centerY
      const distanceFromCenter = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      if (distanceFromCenter < distance) {
        // Calculate magnetic pull based on distance
        const pullStrength = (1 - distanceFromCenter / distance) * strength
        targetX = deltaX * pullStrength
        targetY = deltaY * pullStrength
      } else {
        targetX = 0
        targetY = 0
      }
    }

    const handleMouseLeave = () => {
      targetX = 0
      targetY = 0
    }

    const animate = () => {
      // Smooth interpolation
      currentX += (targetX - currentX) * 0.2
      currentY += (targetY - currentY) * 0.2

      // Apply transform
      element.style.transform = `translate(${currentX}px, ${currentY}px)`
      element.style.transition = 'none'

      animationFrameId = requestAnimationFrame(animate)
    }

    // Start animation loop
    animate()

    // Add event listeners - use window to track cursor even when not directly over element
    window.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      window.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('mouseleave', handleMouseLeave)
      // Reset transform on cleanup
      element.style.transform = ''
      element.style.transition = ''
    }
  }, [distance, strength])

  return ref
}

