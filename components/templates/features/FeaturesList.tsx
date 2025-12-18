'use client'

import { SectionComponentProps, FeaturesSectionData } from '@/types/builder'
import { IconProps } from '@phosphor-icons/react'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { getSectionColors, getPrimaryColor } from '@/lib/section-colors'
import { SEOHeading } from '@/components/ui/seo-heading'
import { getTextCaseClass, applyTextCase } from '@/lib/text-case'
import { getPhosphorIcon } from '@/lib/icon-mapping'

/**
 * FeaturesList - Horizontal list layout for property features
 */
export function FeaturesList({ data, theme, colorScheme = 'light' }: SectionComponentProps<FeaturesSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const { title, features } = data
  const colors = getSectionColors(colorScheme, theme)
  const primaryColor = getPrimaryColor(theme, colorScheme)
  const isDark = colorScheme === 'dark'

  return (
    <section 
      className="w-full py-16 md:py-24"
      style={{ backgroundColor: colors.cardBg }}
    >
      {title && (
        <SEOHeading
          level={2}
          text={title}
          className={`text-[clamp(2rem,5vw,4rem)] font-normal text-center mb-12 ${getTextCaseClass(theme?.titleCase)}`}
          style={{ 
            color: colors.textColor,
            fontFamily: headingFont,
            transform: `scale(${theme?.headingFontSize || 1})`,
            letterSpacing: `${theme?.headingLetterSpacing || 0}em`,
          }}
        >
          {applyTextCase(title, theme?.titleCase)}
        </SEOHeading>
      )}

      <div className="w-full flex flex-wrap justify-center gap-8 md:gap-12">
          {features.map((feature, index) => {
            const IconComponent = feature.icon ? getPhosphorIcon(feature.icon) : null

            return (
              <div 
                key={index}
                className="flex items-center gap-4"
              >
                {IconComponent && (
                  <div 
                    className="flex items-center justify-center w-12 h-12 rounded-full"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : `${primaryColor}15`
                    }}
                  >
                    <IconComponent 
                      className="w-6 h-6" 
                      weight="light"
                      style={{ color: primaryColor }}
                    />
                  </div>
                )}
                <div className="flex flex-col">
                  <span 
                    className="text-xl md:text-2xl font-normal"
                    style={{ color: colors.textColor }}
                  >
                    {feature.value}
                  </span>
                  <span 
                    className="text-sm"
                    style={{ color: colors.secondaryTextColor }}
                  >
                    {feature.label}
                  </span>
                </div>
              </div>
            )
          })}
      </div>
    </section>
  )
}

