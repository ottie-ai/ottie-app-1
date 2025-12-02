'use client'
import { LottieIcon } from './lottie-icon'
import copyAnimation from '@/lib/lottie/system-regular-99-copy-hover-copy.json'

interface LottieCopyIconProps {
  className?: string
  size?: number
}

export function LottieCopyIcon({ className = '', size = 18 }: LottieCopyIconProps) {
  return <LottieIcon animationData={copyAnimation} className={className} size={size} />
}

