'use client'

import { useRef, useEffect, useState } from 'react'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import { LottieIcon } from './lottie-icon'
import screenShareAnimation from '@/lib/lottie/system-regular-194-screen-share-hover-screen-share-1.json'

interface LottieScreenShareIconProps {
  className?: string
  size?: number
  invertTheme?: boolean
  autoLoop?: boolean // If true, automatically loop animation every 5 seconds
}

export function LottieScreenShareIcon({ className = '', size = 18, invertTheme = true, autoLoop = false }: LottieScreenShareIconProps) {
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

  // Handle hover - pause auto-loop and play animation
  const handleMouseEnter = () => {
    setIsHovered(true)
    if (lottieRef.current) {
      lottieRef.current.goToAndPlay(0, true)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  if (!isMounted) {
    return <div className={className} style={{ width: size, height: size }} />
  }

  if (autoLoop) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <LottieIcon
          animationData={screenShareAnimation}
          size={size}
          invertTheme={invertTheme}
        />
      </div>
    )
  }

  return (
    <LottieIcon
      animationData={screenShareAnimation}
      className={className}
      size={size}
      invertTheme={invertTheme}
    />
  )
}

