'use client'

import { LottieIcon } from './lottie-icon'
import logoutAnimation from '@/lib/lottie/system-regular-112-log-sign-out-hover-log-out.json'

interface LottieLogoutIconProps {
  className?: string
}

/**
 * Logout Icon Component
 * Uses Lottie animation with hover effect
 */
export function LottieLogoutIcon({ className = '' }: LottieLogoutIconProps) {
  return <LottieIcon animationData={logoutAnimation} className={className} size={18} />
}

