'use client'

import { LottieIcon } from './lottie-icon'
import accountAnimation from '@/lib/lottie/system-regular-8-account-hover-pinch.json'

interface LottieAccountIconProps {
  className?: string
}

/**
 * Account/Profile Icon Component
 * Uses Lottie animation with hover effect
 */
export function LottieAccountIcon({ className = '' }: LottieAccountIconProps) {
  return <LottieIcon animationData={accountAnimation} className={className} size={18} />
}

