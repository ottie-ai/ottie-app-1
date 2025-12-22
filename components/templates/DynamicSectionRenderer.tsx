'use client'

import { useState, useEffect, Suspense } from 'react'
import { Section, ThemeConfig, ColorScheme } from '@/types/builder'
import { getDynamicComponent, getDynamicComponentWithLoading } from './dynamic-registry'

interface DynamicSectionRendererProps {
  /** Section configuration to render */
  section: Section
  /** Optional theme configuration */
  theme?: ThemeConfig
  /** Optional class name for wrapper */
  className?: string
  /** Color scheme override */
  colorScheme?: ColorScheme
  /** Callback for editing section data */
  onDataChange?: (data: Section['data']) => void
}

/**
 * DynamicSectionRenderer - Dynamically loads and renders a section
 * 
 * Uses dynamic imports to ensure only the needed section code is bundled.
 * This is the production-optimized version of SectionRenderer.
 * 
 * @example
 * ```tsx
 * <DynamicSectionRenderer 
 *   section={{ id: '1', type: 'hero', variant: 'split', data: { headline: 'Welcome' } }}
 *   theme={pageTheme}
 * />
 * ```
 */
export function DynamicSectionRenderer({ 
  section, 
  theme, 
  className, 
  colorScheme, 
  onDataChange 
}: DynamicSectionRendererProps) {
  const sectionColorScheme = colorScheme ?? section.colorScheme ?? 'light'
  
  // Get the dynamic component with Next.js dynamic()
  const Component = getDynamicComponentWithLoading(section.type, section.variant)

  // Component not found in registry
  if (!Component) {
    // In development, show a helpful message
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="p-8 bg-destructive/10 border-2 border-dashed border-destructive/30 rounded-lg text-center">
          <p className="text-destructive font-medium">
            Component not found: {section.type}/{section.variant}
          </p>
          <p className="text-destructive/80 text-sm mt-1">
            Register this component in components/templates/dynamic-registry.ts
          </p>
        </div>
      )
    }
    // In production, return null
    return null
  }

  return (
    <div 
      id={`section-${section.id}`} 
      className={className}
      data-section-type={section.type}
      data-section-variant={section.variant}
      data-color-scheme={sectionColorScheme}
    >
      <Component 
        data={section.data} 
        theme={theme} 
        colorScheme={sectionColorScheme} 
        onDataChange={onDataChange} 
      />
    </div>
  )
}

/**
 * DynamicPageRenderer - Renders multiple sections with dynamic loading
 * Production-optimized version of PageRenderer
 */
interface DynamicPageRendererProps {
  sections: Section[]
  theme?: ThemeConfig
  className?: string
}

export function DynamicPageRenderer({ sections, theme, className }: DynamicPageRendererProps) {
  return (
    <div className={className}>
      {sections.map((section) => (
        <DynamicSectionRenderer
          key={section.id}
          section={section}
          theme={theme}
        />
      ))}
    </div>
  )
}
