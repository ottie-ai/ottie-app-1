'use client'
import { LottieIcon } from './lottie-icon'
import editAnimation from '@/lib/lottie/system-regular-114-edit-pencil-rename-hover-pinch.json'

interface LottieEditIconProps {
  className?: string
  size?: number
}

export function LottieEditIcon({ className = '', size = 18 }: LottieEditIconProps) {
  return <LottieIcon animationData={editAnimation} className={className} size={size} />
}

