'use client'

import { LottieIcon } from './lottie-icon'
import resetAnimation from '@/lib/lottie/system-regular-411-arrow-rotate-360-right-hover-pinch.json'

interface LottieResetIconProps {
  className?: string
  size?: number
}

/**
 * Reset Icon Component (Arrow 360)
 * Uses Lottie animation with hover effect
 */
export function LottieResetIcon({ className = '', size = 18 }: LottieResetIconProps) {
  return <LottieIcon animationData={resetAnimation} className={className} size={size} />
}

