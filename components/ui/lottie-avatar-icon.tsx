'use client'

import { LottieIcon } from './lottie-icon'
import avatarAnimation from '@/lib/lottie/system-regular-8-account-hover-pinch.json'

interface LottieAvatarIconProps {
  className?: string
  size?: number
}

/**
 * Avatar/Account Icon Component
 * Uses Lottie animation with hover effect
 */
export function LottieAvatarIcon({ className = '', size = 18 }: LottieAvatarIconProps) {
  return <LottieIcon animationData={avatarAnimation} className={className} size={size} />
}

