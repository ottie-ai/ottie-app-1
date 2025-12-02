'use client'

import { LottieIcon } from './lottie-icon'
import viewSidebarAnimation from '@/lib/lottie/system-regular-174-view-sidebar-hover-view-sidebar.json'

interface LottieContactsIconProps {
  className?: string
}

/**
 * View Sidebar Icon Component for Client Portals
 * Uses Lottie animation with hover effect
 */
export function LottieContactsIcon({ className = '' }: LottieContactsIconProps) {
  return <LottieIcon animationData={viewSidebarAnimation} className={className} size={18} />
}

