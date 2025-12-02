'use client'
import { LottieIcon } from './lottie-icon'
import inboxAnimation from '@/lib/lottie/system-regular-9-inbox-hover-inbox.json'

interface LottieInboxIconProps {
  className?: string
  size?: number
}

export function LottieInboxIcon({ className = '', size = 18 }: LottieInboxIconProps) {
  return <LottieIcon animationData={inboxAnimation} className={className} size={size} />
}

