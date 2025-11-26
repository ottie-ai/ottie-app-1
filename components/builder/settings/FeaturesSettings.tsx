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
import { getVariants } from '@/components/builder/registry'
import { Sun, Moon } from '@phosphor-icons/react'
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
            ? 'bg-primary text-primary-foreground border-primary' 
            : 'bg-muted/50 border-input hover:bg-muted'
        )}
      >
        <Sun className="size-4" weight={value === 'light' ? 'fill' : 'regular'} />
        <span className="text-sm font-medium">Light</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('dark')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md border transition-colors',
          value === 'dark' 
            ? 'bg-primary text-primary-foreground border-primary' 
            : 'bg-muted/50 border-input hover:bg-muted'
        )}
      >
        <Moon className="size-4" weight={value === 'dark' ? 'fill' : 'regular'} />
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
        <FieldLabel>Layout</FieldLabel>
        <Carousel setApi={setApi} opts={{ loop: true }}>
          <div className="flex items-center justify-between p-2 rounded-md border bg-muted/50">
            <CarouselPrevious className="static translate-y-0 size-7" />
            <CarouselContent className="flex-1 mx-2">
              {featuresVariants.map((v) => (
                <CarouselItem key={v} className="pl-0">
                  <div className="flex items-center justify-center">
                    <span className="text-sm font-medium capitalize">{v}</span>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselNext className="static translate-y-0 size-7" />
          </div>
        </Carousel>
      </Field>

      <Field>
        <FieldLabel>Color Scheme</FieldLabel>
        <ColorSchemeSelector 
          value={colorScheme} 
          onChange={(cs) => onColorSchemeChange?.(cs)} 
        />
      </Field>
    </FieldGroup>
  )
}

