'use client'

import { LottieIcon } from './lottie-icon'
import analyticsAnimation from '@/lib/lottie/system-regular-10-analytics-hover-analytics.json'

interface LottieAnalyticsIconProps {
  className?: string
}

/**
 * Analytics Icon Component for Dashboard
 * Uses Lottie animation with hover effect
 */
export function LottieAnalyticsIcon({ className = '' }: LottieAnalyticsIconProps) {
  return <LottieIcon animationData={analyticsAnimation} className={className} size={18} />
}
