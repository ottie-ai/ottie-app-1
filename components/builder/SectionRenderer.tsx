'use client'

import { Section, ThemeConfig, ColorScheme } from '@/types/builder'
import { getComponent } from './registry'

interface SectionRendererProps {
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
 * SectionRenderer - Dynamically renders a section based on its type and variant
 * 
 * Uses the component registry to find the correct component,
 * then renders it with the section's data.
 * 
 * @example
 * ```tsx
 * <SectionRenderer 
 *   section={{ id: '1', type: 'hero', variant: 'split', data: { headline: 'Welcome' } }}
 *   theme={pageTheme}
 * />
 * ```
 */
export function SectionRenderer({ section, theme, className, colorScheme, onDataChange }: SectionRendererProps) {
  const Component = getComponent(section.type, section.variant)
  const sectionColorScheme = colorScheme ?? section.colorScheme ?? 'light'

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
            Register this component in components/builder/registry.ts
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
      <Component data={section.data} theme={theme} colorScheme={sectionColorScheme} onDataChange={onDataChange} />
    </div>
  )
}

/**
 * Renders multiple sections from a PageConfig
 */
interface PageRendererProps {
  sections: Section[]
  theme?: ThemeConfig
  className?: string
}

export function PageRenderer({ sections, theme, className }: PageRendererProps) {
  return (
    <div className={className}>
      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          theme={theme}
        />
      ))}
    </div>
  )
}

