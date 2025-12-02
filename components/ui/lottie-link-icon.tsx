'use client'

import { LottieIcon } from './lottie-icon'
import linkAnimation from '@/lib/lottie/system-regular-98-link-hover-link.json'

interface LottieLinkIconProps {
  className?: string
  size?: number
}

/**
 * Link Icon Component
 * Uses Lottie animation with hover effect
 */
export function LottieLinkIcon({ className = '', size = 18 }: LottieLinkIconProps) {
  return <LottieIcon animationData={linkAnimation} className={className} size={size} />
}

