'use client'

import { SectionComponentProps, FeaturesSectionData } from '@/types/builder'
import { Bed, Bathtub, Ruler, Car, House, Tree, SwimmingPool, WifiHigh, Fan, Fire, Television, ForkKnife, IconProps } from '@phosphor-icons/react'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { AnimateOnScroll, StaggerContainer, StaggerItem } from '@/components/ui/animate-on-scroll'
import { getFontWeight } from '@/lib/fonts'

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
 * FeaturesGrid - Grid layout for property features
 */
export function FeaturesGrid({ data, theme, colorScheme = 'light' }: SectionComponentProps<FeaturesSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const fontWeight = getFontWeight(theme?.headingFontFamily || '')
  const { title, features } = data
  const isDark = colorScheme === 'dark'

  return (
    <section className="relative min-h-screen z-30 bg-transparent flex items-center">
      <div className="container mx-auto px-4 py-16 md:py-24">
        {title && (
          <AnimateOnScroll animation="fade-up" delay={0.5}>
            <h2 
              className={cn(
                'text-[clamp(2rem,5vw,4rem)] text-center mb-12 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                theme?.uppercaseTitles ? 'uppercase' : ''
              )}
              style={{ 
                fontFamily: headingFont,
                fontWeight: fontWeight,
                transform: `scale(${theme?.headingFontSize || 1})`,
                letterSpacing: `${theme?.headingLetterSpacing || 0}em`,
                color: isDark ? '#ffffff' : (theme?.textColor || '#111827')
              }}
            >
              {title}
            </h2>
          </AnimateOnScroll>
        )}

        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto" staggerDelay={0.1} baseDelay={0.7}>
          {features.map((feature, index) => {
            const IconComponent = feature.icon ? iconMap[feature.icon.toLowerCase()] : null

            return (
              <StaggerItem key={index}>
                <div 
                  className={cn(
                    'flex flex-col items-center text-center p-6 rounded-xl transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    isDark 
                      ? 'bg-white/5 hover:bg-white/10 border border-white/10' 
                      : 'bg-black/5 hover:bg-black/10 border border-black/10'
                  )}
                >
                  {IconComponent && (
                    <IconComponent 
                      className="w-8 h-8 mb-3 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                      weight="light"
                      style={{ 
                        color: isDark ? 'rgba(255,255,255,0.7)' : (theme?.primaryColor || '#3b82f6')
                      }}
                    />
                  )}
                  <span 
                    className="text-2xl md:text-3xl font-semibold mb-1 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ 
                      color: isDark ? '#ffffff' : (theme?.textColor || '#111827')
                    }}
                  >
                    {feature.value}
                  </span>
                  <span 
                    className="text-sm transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ 
                      color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280'
                    }}
                  >
                    {feature.label}
                  </span>
                </div>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      </div>
    </section>
  )
}

