'use client'

import { SectionComponentProps, FeaturesSectionData } from '@/types/builder'
import { Bed, Bathtub, Ruler, Car, House, Tree, SwimmingPool, WifiHigh, Fan, Fire, Television, ForkKnife, IconProps } from '@phosphor-icons/react'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { ComponentType } from 'react'
import { cn } from '@/lib/utils'

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
  const isDark = colorScheme === 'dark'

  return (
    <section className={cn(
      "py-16 md:py-24",
      isDark ? "bg-black/10" : "bg-gray-50"
    )}>
      <div className="container mx-auto px-4">
        {title && (
          <h2 
            className={`text-[clamp(2rem,5vw,4rem)] font-semibold text-center mb-12 ${theme?.uppercaseTitles ? 'uppercase' : ''}`}
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
                    className="flex items-center justify-center w-12 h-12 rounded-full"
                    style={theme?.primaryColor ? { 
                      backgroundColor: `${theme.primaryColor}15` 
                    } : { 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(59,130,246,0.1)' 
                    }}
                  >
                    <IconComponent 
                      className="w-6 h-6" 
                      weight="light"
                      style={theme?.primaryColor ? { 
                        color: theme.primaryColor 
                      } : { 
                        color: isDark ? 'rgba(255,255,255,0.8)' : '#3b82f6' 
                      }}
                    />
                  </div>
                )}
                <div className="flex flex-col">
                  <span 
                    className={cn(
                      "text-xl md:text-2xl font-bold",
                      isDark ? "text-white" : ""
                    )}
                    style={!isDark && theme?.textColor ? { color: theme.textColor } : undefined}
                  >
                    {feature.value}
                  </span>
                  <span className={cn(
                    "text-sm",
                    isDark ? "text-white/60" : "text-gray-600"
                  )}>
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

