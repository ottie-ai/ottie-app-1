'use client'

import { LottieIcon } from './lottie-icon'
import viewAnimation from '@/lib/lottie/system-regular-27-view-4-hover-view-4.json'

interface LottieViewIconProps {
  className?: string
}

/**
 * View Icon Component for Dashboard Page
 * Uses Lottie animation with hover effect
 */
export function LottieViewIcon({ className = '' }: LottieViewIconProps) {
  return <LottieIcon animationData={viewAnimation} className={className} size={18} />
}

