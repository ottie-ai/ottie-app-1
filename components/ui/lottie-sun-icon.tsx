'use client'
import { LottieIcon } from './lottie-icon'
import sunAnimation from '@/lib/lottie/system-regular-730-spinner-sun-loop-expand.json'

interface LottieSunIconProps {
  className?: string
  size?: number
}

export function LottieSunIcon({ className = '', size = 18 }: LottieSunIconProps) {
  return <LottieIcon animationData={sunAnimation} className={className} size={size} />
}

