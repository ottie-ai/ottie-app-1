'use client'

import { SectionComponentProps, FeaturesSectionData } from '@/types/builder'
import { Bed, Bathtub, Ruler, Car, House, Tree, SwimmingPool, WifiHigh, Fan, Fire, Television, ForkKnife, IconProps } from '@phosphor-icons/react'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { getSectionColors, getPrimaryColor } from '@/lib/section-colors'

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
export function FeaturesList({ data, theme, colorScheme = 'light' }: SectionComponentProps<FeaturesSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const { title, features } = data
  const colors = getSectionColors(colorScheme, theme)
  const primaryColor = getPrimaryColor(theme, colorScheme)
  const isDark = colorScheme === 'dark'

  return (
    <section 
      className="py-16 md:py-24"
      style={{ backgroundColor: colors.cardBg }}
    >
      <div className="container mx-auto px-4">
        {title && (
          <h2 
            className={`text-[clamp(2rem,5vw,4rem)] font-semibold text-center mb-12 ${theme?.uppercaseTitles ? 'uppercase' : ''}`}
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
                    className="text-xl md:text-2xl font-bold"
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
      </div>
    </section>
  )
}

