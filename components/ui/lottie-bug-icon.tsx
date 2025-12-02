'use client'
import { LottieIcon } from './lottie-icon'
import bugAnimation from '@/lib/lottie/system-regular-21-bug-hover-bug-1.json'

interface LottieBugIconProps {
  className?: string
  size?: number
}

export function LottieBugIcon({ className = '', size = 18 }: LottieBugIconProps) {
  return <LottieIcon animationData={bugAnimation} className={className} size={size} />
}

