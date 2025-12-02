'use client'
import { LottieIcon } from './lottie-icon'
import mailOpenAnimation from '@/lib/lottie/system-regular-190-mail-envelope-open-hover-mail-open.json'

interface LottieMailOpenIconProps {
  className?: string
  size?: number
}

export function LottieMailOpenIcon({ className = '', size = 18 }: LottieMailOpenIconProps) {
  return <LottieIcon animationData={mailOpenAnimation} className={className} size={size} />
}

