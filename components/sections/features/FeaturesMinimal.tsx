'use client'

import { SectionComponentProps, FeaturesSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'

/**
 * FeaturesMinimal - Clean minimal layout with large numbers
 */
export function FeaturesMinimal({ data, theme }: SectionComponentProps<FeaturesSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const { title, features } = data

  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        {title && (
          <h2 
            className={`text-[clamp(2rem,5vw,4rem)] font-semibold text-center mb-16 ${theme?.uppercaseTitles ? 'uppercase' : ''}`}
            style={{ 
              color: theme?.textColor,
              fontFamily: headingFont,
              transform: `scale(${theme?.headingFontSize || 1})`,
              letterSpacing: `${theme?.headingLetterSpacing || 0}em`,
            }}
          >
            {title}
          </h2>
        )}

        <div className="flex flex-wrap justify-center divide-x divide-border max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="flex flex-col items-center text-center px-8 md:px-12 py-4"
            >
              <span 
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-2"
                style={{ 
                  color: theme?.primaryColor || theme?.textColor,
                  fontFamily: headingFont,
                }}
              >
                {feature.value}
              </span>
              <span 
                className={`text-sm md:text-base text-muted-foreground tracking-wide ${theme?.uppercaseTitles ? 'uppercase' : ''}`}
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

