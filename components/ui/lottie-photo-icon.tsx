'use client'

import { LottieIcon } from './lottie-icon'
import photoAnimation from '@/lib/lottie/system-regular-72-photo-hover-pinch.json'

interface LottiePhotoIconProps {
  className?: string
  size?: number
}

/**
 * Photo Icon Component
 * Uses Lottie animation with hover effect
 */
export function LottiePhotoIcon({ className = '', size = 24 }: LottiePhotoIconProps) {
  return <LottieIcon animationData={photoAnimation} className={className} size={size} />
}

