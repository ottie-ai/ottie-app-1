'use client'

import { SectionComponentProps, FeaturesSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { getSectionColors, getPrimaryColor } from '@/lib/section-colors'

/**
 * FeaturesMinimal - Clean minimal layout with large numbers
 */
export function FeaturesMinimal({ data, theme, colorScheme = 'light' }: SectionComponentProps<FeaturesSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const { title, features } = data
  const colors = getSectionColors(colorScheme, theme)
  const primaryColor = getPrimaryColor(theme, colorScheme)
  const isDark = colorScheme === 'dark'

  return (
    <section 
      className="py-20 md:py-32"
      style={{ backgroundColor: colors.backgroundColor }}
    >
      <div className="container mx-auto px-4">
        {title && (
          <h2 
            className={`text-[clamp(2rem,5vw,4rem)] font-semibold text-center mb-16 ${theme?.uppercaseTitles ? 'uppercase' : ''}`}
            style={{ 
              color: colors.textColor,
              fontFamily: headingFont,
              transform: `scale(${theme?.headingFontSize || 1})`,
              letterSpacing: `${theme?.headingLetterSpacing || 0}em`,
            }}
          >
            {title}
          </h2>
        )}

        <div 
          className="flex flex-wrap justify-center divide-x max-w-4xl mx-auto"
          style={{ borderColor: colors.borderColor }}
        >
          {features.map((feature, index) => (
            <div 
              key={index}
              className="flex flex-col items-center text-center px-8 md:px-12 py-4"
            >
              <span 
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-2"
                style={{ 
                  color: primaryColor,
                  fontFamily: headingFont,
                }}
              >
                {feature.value}
              </span>
              <span 
                className={`text-sm md:text-base tracking-wide ${theme?.uppercaseTitles ? 'uppercase' : ''}`}
                style={{ color: colors.secondaryTextColor }}
              >
                {feature.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

