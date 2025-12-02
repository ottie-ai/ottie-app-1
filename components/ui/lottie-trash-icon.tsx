'use client'
import { LottieIcon } from './lottie-icon'
import trashAnimation from '@/lib/lottie/system-regular-39-trash-hover-trash-empty.json'

interface LottieTrashIconProps {
  className?: string
  size?: number
  destructive?: boolean
}

export function LottieTrashIcon({ className = '', size = 18, destructive = true }: LottieTrashIconProps) {
  return <LottieIcon animationData={trashAnimation} className={className} size={size} destructive={destructive} />
}

