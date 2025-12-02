'use client'
import { LottieIcon } from './lottie-icon'
import analyticsAnimation from '@/lib/lottie/system-regular-10-analytics-hover-analytics.json'

interface LottieAnalyticsIconProps {
  className?: string
  size?: number
}

export function LottieAnalyticsIcon({ className = '', size = 18 }: LottieAnalyticsIconProps) {
  return <LottieIcon animationData={analyticsAnimation} className={className} size={size} />
}

