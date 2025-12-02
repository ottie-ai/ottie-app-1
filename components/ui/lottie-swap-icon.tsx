'use client'

import { LottieIcon } from './lottie-icon'
import swapAnimation from '@/lib/lottie/system-regular-154-swap-hover-swap.json'

interface LottieSwapIconProps {
  className?: string
  size?: number
}

/**
 * Swap Icon Component for switching workspaces
 * Uses Lottie animation with hover effect
 */
export function LottieSwapIcon({ className = '', size = 18 }: LottieSwapIconProps) {
  return <LottieIcon animationData={swapAnimation} className={className} size={size} />
}

