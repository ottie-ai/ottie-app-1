'use client'
import { LottieIcon } from './lottie-icon'
import fileAnimation from '@/lib/lottie/system-regular-50-file-hover-file-1.json'

interface LottieFileIconProps {
  className?: string
  size?: number
}

export function LottieFileIcon({ className = '', size = 18 }: LottieFileIconProps) {
  return <LottieIcon animationData={fileAnimation} className={className} size={size} />
}

