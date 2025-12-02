'use client'

import { LottieIcon } from './lottie-icon'
import globeAnimation from '@/lib/lottie/system-regular-73-world-globe-wikis-hover-world.json'

interface LottieGlobeIconProps {
  className?: string
}

/**
 * Globe Icon Component for Sites Navigation
 * Uses Lottie animation with hover effect
 */
export function LottieGlobeIcon({ className = '' }: LottieGlobeIconProps) {
  return <LottieIcon animationData={globeAnimation} className={className} size={18} />
}

