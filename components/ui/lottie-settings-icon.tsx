'use client'

import { LottieIcon } from './lottie-icon'
import settingsAnimation from '@/lib/lottie/system-regular-109-slider-toggle-settings-morph-slider.json'

interface LottieSettingsIconProps {
  className?: string
  size?: number
  forceLightMode?: boolean
}

/**
 * Settings Icon Component
 * Uses Lottie animation with hover effect
 */
export function LottieSettingsIcon({ className = '', size = 18, forceLightMode = false }: LottieSettingsIconProps) {
  return <LottieIcon animationData={settingsAnimation} className={className} size={size} forceLightMode={forceLightMode} />
}

