'use client'
import { LottieIcon } from './lottie-icon'
import bookAnimation from '@/lib/lottie/system-regular-19-book-hover-book.json'

interface LottieBookIconProps {
  className?: string
  size?: number
}

export function LottieBookIcon({ className = '', size = 18 }: LottieBookIconProps) {
  return <LottieIcon animationData={bookAnimation} className={className} size={size} />
}

