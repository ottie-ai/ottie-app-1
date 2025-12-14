'use client'

import { LottieIcon } from './lottie-icon'
import groupsAnimation from '@/lib/lottie/system-regular-96-groups-hover-groups.json'

interface LottieGroupsIconProps {
  className?: string
  invertTheme?: boolean
}

/**
 * Groups Icon Component for Leads Navigation
 * Uses Lottie animation with hover effect
 */
export function LottieGroupsIcon({ className = '', invertTheme = false }: LottieGroupsIconProps) {
  return <LottieIcon animationData={groupsAnimation} className={className} size={18} invertTheme={invertTheme} />
}

