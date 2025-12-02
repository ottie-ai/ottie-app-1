'use client'

import { LottieIcon } from './lottie-icon'
import forumAnimation from '@/lib/lottie/system-regular-192-forum-hover-forum.json'

interface LottieForumIconProps {
  className?: string
}

/**
 * Forum Icon Component for Feedback
 * Uses Lottie animation with hover effect
 */
export function LottieForumIcon({ className = '' }: LottieForumIconProps) {
  return <LottieIcon animationData={forumAnimation} className={className} size={18} useGradient={true} />
}

