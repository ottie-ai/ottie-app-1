'use client'

import { LottieIcon } from './lottie-icon'
import groupsAnimation from '@/lib/lottie/system-regular-96-groups-hover-groups.json'

interface LottieGroupsIconProps {
  className?: string
}

/**
 * Groups Icon Component for Leads Navigation
 * Uses Lottie animation with hover effect
 */
export function LottieGroupsIcon({ className = '' }: LottieGroupsIconProps) {
  return <LottieIcon animationData={groupsAnimation} className={className} size={18} />
}

