'use client'

import React from 'react'
import { SectionComponentProps, HighlightsSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { getSectionColors } from '@/lib/section-colors'
import { getPhosphorIcon, kebabToPascalCase } from '@/lib/icon-mapping'
import { IconProps } from '@phosphor-icons/react'
import * as PhosphorIcons from '@phosphor-icons/react'
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll'

/**
 * HighlightsSimple - Clean two-column layout with dividers
 * Left column: Large serif category headings with icons
 * Right column: Title + Subtitle pairs
 */
export function HighlightsSimple({ data, theme, colorScheme = 'light' }: SectionComponentProps<HighlightsSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const { highlights } = data
  const colors = getSectionColors(colorScheme, theme)

  return (
    <section 
      className="w-full py-16 md:py-24"
      style={{ backgroundColor: colors.backgroundColor }}
    >
      <div className="site-container">
        <div className="w-full space-y-0">
          {highlights.map((highlight, index) => {
            // Left column: Category label (e.g., "Description", "Share", "Location")
            const categoryLabel = highlight.title || ''
            // Right column: Content text
            const contentText = highlight.text || ''
            // Icon component - try mapping first, then direct lookup
            let IconComponent: React.ComponentType<IconProps> | null = null
            if (highlight.icon) {
              // First try the mapping
              IconComponent = getPhosphorIcon(highlight.icon)
              // If not found, try direct lookup from PhosphorIcons
              if (!IconComponent) {
                const pascalName = kebabToPascalCase(highlight.icon)
                IconComponent = (PhosphorIcons as any)[pascalName] || null
              }
            }
            const hasIcon = highlight.icon && IconComponent

            return (
              <AnimateOnScroll 
                key={index}
                animation="fade-up" 
                delay={0.2 + (index * 0.05)}
              >
                <div>
                  {/* Row - 50/50 split */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 py-12 md:py-16 items-center">
                    {/* Left Column - Title */}
                    <div className="flex items-center gap-6">
                      {hasIcon && (
                        <div
                          className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full flex-shrink-0 border"
                          style={{
                            borderColor: colors.borderColor,
                          }}
                        >
                          <IconComponent
                            className="w-6 h-6 md:w-7 md:h-7"
                            weight="light"
                            style={{ color: colors.borderColor }}
                          />
                        </div>
                      )}
                      <h3
                        className="text-4xl md:text-5xl lg:text-6xl font-serif font-normal leading-none tracking-tight"
                        style={{ 
                          color: colors.textColor,
                          fontFamily: headingFont,
                        }}
                      >
                        {categoryLabel}
                      </h3>
                    </div>

                    {/* Right Column - Subtitle */}
                    <div className="flex flex-col items-start">
                      {contentText && (
                        <p
                          className="text-base md:text-lg leading-relaxed text-left"
                          style={{ color: colors.secondaryTextColor }}
                        >
                          {contentText}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Divider - Show between items, not after last */}
                  {index < highlights.length - 1 && (
                    <div
                      className="w-full h-px"
                      style={{ backgroundColor: colors.borderColor }}
                    />
                  )}
                </div>
              </AnimateOnScroll>
            )
          })}
        </div>
      </div>
    </section>
  )
}

