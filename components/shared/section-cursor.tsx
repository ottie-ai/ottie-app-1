'use client'

import dynamic from 'next/dynamic'
import type { ThemeConfig } from '@/types/builder'
import type { CursorIconType } from './frosty-cursor'

// Dynamically import cursors - only the needed one will be bundled for each page
const FrostyCursor = dynamic(() => import('./frosty-cursor').then(mod => ({ default: mod.FrostyCursor })), {
  ssr: false,
})

const CircleCursor = dynamic(() => import('./circle-cursor').then(mod => ({ default: mod.CircleCursor })), {
  ssr: false,
})

export interface SectionCursorProps {
  /**
   * Selector for elements that should trigger cursor expansion
   */
  targetSelector?: string
  /**
   * Size of cursor in normal state (default: 20)
   */
  size?: number
  /**
   * Size of cursor when expanded (default: 120)
   */
  expandedSize?: number
  /**
   * Theme config to get cursor style from
   */
  theme?: ThemeConfig
  /**
   * Icon to display - can be 'play', 'arrow', or a custom icon component
   * Defaults to 'play' for frosty style, 'arrow' for circle style
   */
  icon?: CursorIconType
  /**
   * Custom className for the cursor element
   */
  className?: string
}

/**
 * SectionCursor - Smart wrapper that dynamically loads the correct cursor style
 * 
 * Based on theme.cursorStyle, this component will:
 * - Load FrostyCursor for 'frosty' style
 * - Load CircleCursor for 'circle' style
 * - Render nothing for 'none' style
 * 
 * This ensures that only the needed cursor code is bundled in production.
 */
export function SectionCursor({
  targetSelector,
  size = 20,
  expandedSize = 120,
  theme,
  icon,
  className = '',
}: SectionCursorProps) {
  // Determine cursor style from theme or default to 'frosty'
  const cursorStyle = theme?.cursorStyle || 'frosty'
  
  // If cursor is disabled, render nothing
  if (cursorStyle === 'none') {
    return null
  }

  // Render the appropriate cursor based on style
  if (cursorStyle === 'frosty') {
    return (
      <FrostyCursor
        targetSelector={targetSelector}
        size={size}
        expandedSize={expandedSize}
        icon={icon || 'play'}
        className={className}
      />
    )
  }

  if (cursorStyle === 'circle') {
    return (
      <CircleCursor
        targetSelector={targetSelector}
        size={size}
        expandedSize={expandedSize}
        icon={icon || 'arrow'}
        className={className}
      />
    )
  }

  return null
}
