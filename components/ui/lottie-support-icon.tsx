'use client'

import { LottieIcon } from './lottie-icon'
import supportAnimation from '@/lib/lottie/system-regular-158-support-hover-support.json'

interface LottieSupportIconProps {
  className?: string
}

/**
 * Support Icon Component for Help & Support
 * Uses Lottie animation with hover effect
 */
export function LottieSupportIcon({ className = '' }: LottieSupportIconProps) {
  return <LottieIcon animationData={supportAnimation} className={className} size={18} />
}

