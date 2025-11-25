'use client'

import { SectionComponentProps, FeaturesSectionData } from '@/types/builder'
import { Bed, Bath, Ruler, Car, Home, Trees, Waves, Wifi, Wind, Flame, Tv, UtensilsCrossed } from 'lucide-react'

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  bed: Bed,
  bath: Bath,
  ruler: Ruler,
  car: Car,
  home: Home,
  trees: Trees,
  pool: Waves,
  wifi: Wifi,
  ac: Wind,
  heating: Flame,
  tv: Tv,
  kitchen: UtensilsCrossed,
}

/**
 * FeaturesGrid - Grid layout for property features
 */
export function FeaturesGrid({ data, theme }: SectionComponentProps<FeaturesSectionData>) {
  const { title, features } = data

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {title && (
          <h2 
            className="text-2xl md:text-3xl font-semibold text-center mb-12"
            style={{ color: theme?.textColor }}
          >
            {title}
          </h2>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {features.map((feature, index) => {
            const IconComponent = feature.icon ? iconMap[feature.icon.toLowerCase()] : null

            return (
              <div 
                key={index}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                {IconComponent && (
                  <IconComponent 
                    className="w-8 h-8 mb-3" 
                    style={{ color: theme?.primaryColor || '#3b82f6' }}
                  />
                )}
                <span 
                  className="text-2xl md:text-3xl font-semibold mb-1"
                  style={{ color: theme?.textColor }}
                >
                  {feature.value}
                </span>
                <span className="text-sm text-muted-foreground">
                  {feature.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

