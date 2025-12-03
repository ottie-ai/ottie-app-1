'use client'

import { LottieIcon } from './lottie-icon'
import lockAnimation from '@/lib/lottie/system-regular-90-lock-closed-hover-pinch.json'

interface LottieLockIconProps {
  className?: string
  size?: number
}

/**
 * Lock Icon Component
 * Uses Lottie animation with hover effect
 */
export function LottieLockIcon({ className = '', size = 18 }: LottieLockIconProps) {
  return <LottieIcon animationData={lockAnimation} className={className} size={size} />
}

