'use client'

import { useRef, useEffect, useState } from 'react'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import { LottieIcon } from './lottie-icon'
import laptopAnimation from '@/lib/lottie/system-regular-79-laptop-computer-hover-laptop.json'

interface LottieLaptopIconProps {
  className?: string
  size?: number
  invertTheme?: boolean
  autoLoop?: boolean // If true, automatically loop animation every 5 seconds
}

export function LottieLaptopIcon({ className = '', size = 18, invertTheme, autoLoop = false }: LottieLaptopIconProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Auto-loop animation every 5 seconds
  useEffect(() => {
    if (!autoLoop || !lottieRef.current || !isMounted) return

    const playAnimation = () => {
      if (lottieRef.current && !isHovered) {
        lottieRef.current.goToAndPlay(0, true)
      }
    }

    // Play once on mount after a short delay
    const initialTimeout = setTimeout(playAnimation, 500)

    // Then repeat every 5 seconds
    intervalRef.current = setInterval(playAnimation, 5000)

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoLoop, isMounted, isHovered])

  // Detect hover on parent element instead of icon itself
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!containerRef.current || !isMounted) return

    const container = containerRef.current
    const parent = container.closest('a, button, [role="button"], [data-slot="dropdown-menu-item"], .group')
    
    if (!parent) return

    const handleMouseEnter = () => {
      setIsHovered(true)
      if (lottieRef.current) {
        lottieRef.current.goToAndPlay(0, true)
      }
    }
    const handleMouseLeave = () => setIsHovered(false)

    parent.addEventListener('mouseenter', handleMouseEnter)
    parent.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      parent.removeEventListener('mouseenter', handleMouseEnter)
      parent.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [isMounted])

  if (!isMounted) {
    return <div className={className} style={{ width: size, height: size }} />
  }

  if (autoLoop) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ width: size, height: size, pointerEvents: 'none' }}
      >
        <LottieIcon
          animationData={laptopAnimation}
          size={size}
          invertTheme={invertTheme}
        />
      </div>
    )
  }

  return (
    <LottieIcon
      animationData={laptopAnimation}
      className={className}
      size={size}
      invertTheme={invertTheme}
    />
  )
}

