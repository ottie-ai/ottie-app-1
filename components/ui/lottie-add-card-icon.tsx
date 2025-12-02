'use client'

import { LottieIcon } from './lottie-icon'
import addCardAnimation from '@/lib/lottie/system-regular-40-add-card-hover-add-card.json'

interface LottieAddCardIconProps {
  className?: string
  size?: number
  invertTheme?: boolean
}

/**
 * Add Card Icon Component for New Site buttons
 * Uses Lottie animation with hover effect
 * invertTheme: invert theme colors (for primary buttons where bg color is opposite of theme)
 */
export function LottieAddCardIcon({ className = '', size = 18, invertTheme = true }: LottieAddCardIconProps) {
  return <LottieIcon animationData={addCardAnimation} className={className} size={size} invertTheme={invertTheme} />
}

