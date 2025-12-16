'use client'

import { ReactNode, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SEOHeadingProps {
  /** The heading level (1-6) */
  level: 1 | 2 | 3 | 4 | 5 | 6
  /** The full text for SEO (aria-label) */
  text: string
  /** The animated content (WordReveal or other animated content) */
  children: ReactNode
  /** Additional className for the heading */
  className?: string
  /** Additional props to pass to the heading element */
  [key: string]: any
}

/**
 * SEO-friendly heading component
 * Wraps animated content with aria-label for screen readers and SEO
 * 
 * Format:
 * <h1 aria-label="Full text">
 *   <span aria-hidden="true">
 *     Animated content (e.g., WordReveal)
 *   </span>
 * </h1>
 */
export const SEOHeading = forwardRef<HTMLElement, SEOHeadingProps>(
  function SEOHeading({ 
    level, 
    text, 
    children, 
    className,
    ...props 
  }, ref) {
    const headingProps = {
      ref: ref as any,
      'aria-label': text,
      className: cn(className),
      ...props,
    }

    switch (level) {
      case 1:
        return <h1 {...headingProps}><span aria-hidden="true">{children}</span></h1>
      case 2:
        return <h2 {...headingProps}><span aria-hidden="true">{children}</span></h2>
      case 3:
        return <h3 {...headingProps}><span aria-hidden="true">{children}</span></h3>
      case 4:
        return <h4 {...headingProps}><span aria-hidden="true">{children}</span></h4>
      case 5:
        return <h5 {...headingProps}><span aria-hidden="true">{children}</span></h5>
      case 6:
        return <h6 {...headingProps}><span aria-hidden="true">{children}</span></h6>
      default:
        return <h1 {...headingProps}><span aria-hidden="true">{children}</span></h1>
    }
  }
)

