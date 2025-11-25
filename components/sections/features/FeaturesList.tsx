'use client'

import { SectionComponentProps, FeaturesSectionData } from '@/types/builder'
import { Bed, Bathtub, Ruler, Car, House, Tree, SwimmingPool, WifiHigh, Fan, Fire, Television, ForkKnife, IconProps } from '@phosphor-icons/react'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { ComponentType } from 'react'

// Icon mapping
const iconMap: Record<string, ComponentType<IconProps>> = {
  bed: Bed,
  bath: Bathtub,
  ruler: Ruler,
  car: Car,
  home: House,
  trees: Tree,
  pool: SwimmingPool,
  wifi: WifiHigh,
  ac: Fan,
  heating: Fire,
  tv: Television,
  kitchen: ForkKnife,
}

/**
 * FeaturesList - Horizontal list layout for property features
 */
export function FeaturesList({ data, theme }: SectionComponentProps<FeaturesSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const { title, features } = data

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {title && (
          <h2 
            className={`text-2xl md:text-3xl font-semibold text-center mb-12 ${theme?.uppercaseTitles ? 'uppercase' : ''}`}
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

        <div className="flex flex-wrap justify-center gap-8 md:gap-12 max-w-5xl mx-auto">
          {features.map((feature, index) => {
            const IconComponent = feature.icon ? iconMap[feature.icon.toLowerCase()] : null

            return (
              <div 
                key={index}
                className="flex items-center gap-4"
              >
                {IconComponent && (
                  <div 
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10"
                    style={theme?.primaryColor ? { backgroundColor: `${theme.primaryColor}15` } : undefined}
                  >
                    <IconComponent 
                      className="w-6 h-6 text-primary" 
                      style={theme?.primaryColor ? { color: theme.primaryColor } : undefined}
                    />
                  </div>
                )}
                <div className="flex flex-col">
                  <span 
                    className="text-xl md:text-2xl font-bold"
                    style={{ color: theme?.textColor }}
                  >
                    {feature.value}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {feature.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

