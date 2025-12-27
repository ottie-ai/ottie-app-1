'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface LightModeWrapperProps {
  children: React.ReactNode
  className?: string
}

/**
 * LightModeWrapper - Forces light mode for all child components
 * 
 * This wrapper uses CSS to override dark mode styles by setting CSS variables
 * to light mode values. All Shadcn UI components inside will render in light mode
 * regardless of the global theme.
 * 
 * @example
 * ```tsx
 * <LightModeWrapper>
 *   <Button>Click me</Button>
 *   <Tabs>...</Tabs>
 * </LightModeWrapper>
 * ```
 */
export function LightModeWrapper({ children, className }: LightModeWrapperProps) {
  return (
    <div className={cn('force-light-mode', className)}>
      {children}
    </div>
  )
}









