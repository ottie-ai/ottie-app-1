'use client'
import { LottieIcon } from './lottie-icon'
import bulbAnimation from '@/lib/lottie/system-regular-121-bulb-hover-bulb.json'

interface LottieBulbIconProps {
  className?: string
  size?: number
}

export function LottieBulbIcon({ className = '', size = 18 }: LottieBulbIconProps) {
  return <LottieIcon animationData={bulbAnimation} className={className} size={size} />
}

