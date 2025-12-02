'use client'

import { LottieIcon } from './lottie-icon'
import settingsAnimation from '@/lib/lottie/system-regular-109-slider-toggle-settings-morph-slider.json'

interface LottieSettingsIconProps {
  className?: string
}

/**
 * Settings Icon Component
 * Uses Lottie animation with hover effect
 */
export function LottieSettingsIcon({ className = '' }: LottieSettingsIconProps) {
  return <LottieIcon animationData={settingsAnimation} className={className} size={18} />
}

