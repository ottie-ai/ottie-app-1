'use client'
import { LottieIcon } from './lottie-icon'
import compareAnimation from '@/lib/lottie/system-regular-35-compare-hover-compare.json'

interface LottieCompareIconProps {
  className?: string
  size?: number
}

export function LottieCompareIcon({ className = '', size = 18 }: LottieCompareIconProps) {
  return <LottieIcon animationData={compareAnimation} className={className} size={size} />
}

