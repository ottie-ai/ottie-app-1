'use client'

import { LottieIcon } from './lottie-icon'
import flagAnimation from '@/lib/lottie/system-regular-100-flag-hover-flag.json'

interface LottieFlagIconProps {
  className?: string
  size?: number
}

/**
 * Flag Icon Component
 * Uses Lottie animation with hover effect
 */
export function LottieFlagIcon({ className = '', size = 18 }: LottieFlagIconProps) {
  return <LottieIcon animationData={flagAnimation} className={className} size={size} />
}

