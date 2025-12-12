'use client'

import { useEffect, useCallback, useState } from 'react'
import { FeaturesSectionData, ColorScheme } from '@/types/builder'
import { 
  Field, 
  FieldGroup, 
  FieldLabel 
} from '@/components/ui/field'
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselPrevious, 
  CarouselNext,
  type CarouselApi 
} from '@/components/ui/carousel'
import { getVariants } from '@/components/templates/registry'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// Color Scheme Selector Component
// ============================================

interface ColorSchemeSelectorProps {
  value: ColorScheme
  onChange: (value: ColorScheme) => void
}

function ColorSchemeSelector({ value, onChange }: ColorSchemeSelectorProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('light')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md border transition-colors',
          value === 'light' 
            ? 'bg-white text-gray-900 border-gray-300 shadow-sm' 
            : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-700'
        )}
      >
        <Sun className="size-4" />
        <span className="text-sm font-medium">Light</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('dark')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md border transition-colors',
          value === 'dark' 
            ? 'bg-white text-gray-900 border-gray-300 shadow-sm' 
            : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-700'
        )}
      >
        <Moon className="size-4" />
        <span className="text-sm font-medium">Dark</span>
      </button>
    </div>
  )
}

// ============================================
// Remix Panel - Layout
// ============================================

interface FeaturesRemixPanelProps {
  variant: string
  data: FeaturesSectionData
  colorScheme?: ColorScheme
  onVariantChange: (variant: string) => void
  onDataChange: (data: FeaturesSectionData) => void
  onColorSchemeChange?: (colorScheme: ColorScheme) => void
}

export function FeaturesRemixPanel({ 
  variant,
  colorScheme = 'light',
  onVariantChange,
  onColorSchemeChange,
}: FeaturesRemixPanelProps) {
  const featuresVariants = getVariants('features')
  const [api, setApi] = useState<CarouselApi>()
  
  const currentIndex = featuresVariants.indexOf(variant)

  useEffect(() => {
    if (!api) return
    if (currentIndex >= 0) {
      api.scrollTo(currentIndex)
    }
  }, [api, currentIndex])

  const onSelect = useCallback(() => {
    if (!api) return
    const selectedIndex = api.selectedScrollSnap()
    const selectedVariant = featuresVariants[selectedIndex]
    if (selectedVariant && selectedVariant !== variant) {
      onVariantChange(selectedVariant)
    }
  }, [api, featuresVariants, variant, onVariantChange])

  useEffect(() => {
    if (!api) return
    api.on('select', onSelect)
    return () => {
      api.off('select', onSelect)
    }
  }, [api, onSelect])

  return (
    <FieldGroup className="gap-5">
      <Field>
        <FieldLabel className="text-gray-600">Layout</FieldLabel>
        <Carousel setApi={setApi} opts={{ loop: true }}>
          <div className="flex items-center justify-between p-2 rounded-md border border-gray-200 bg-gray-100">
            <CarouselPrevious className="static translate-y-0 size-7 text-gray-700 hover:text-gray-900" />
            <CarouselContent className="flex-1 mx-2">
              {featuresVariants.map((v) => (
                <CarouselItem key={v} className="pl-0">
                  <div className="flex items-center justify-center">
                    <span className="text-sm font-medium capitalize text-gray-900">{v}</span>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselNext className="static translate-y-0 size-7 text-gray-700 hover:text-gray-900" />
          </div>
        </Carousel>
      </Field>

      <Field>
        <FieldLabel className="text-gray-600">Color Scheme</FieldLabel>
        <ColorSchemeSelector 
          value={colorScheme} 
          onChange={(cs) => onColorSchemeChange?.(cs)} 
        />
      </Field>
    </FieldGroup>
  )
}

