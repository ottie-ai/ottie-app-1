'use client'

import { LottieIcon } from './lottie-icon'
import filterAnimation from '@/lib/lottie/system-regular-110-filter-hover-filter.json'

interface LottieFilterIconProps {
  className?: string
  size?: number
}

/**
 * Filter Icon Component
 * Uses Lottie animation with hover effect
 */
export function LottieFilterIcon({ className = '', size = 18 }: LottieFilterIconProps) {
  return <LottieIcon animationData={filterAnimation} className={className} size={size} />
}

