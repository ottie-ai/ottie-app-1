'use client'

import { useEffect, useCallback } from 'react'
import { ThemeConfig } from '@/types/builder'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselPrevious, 
  CarouselNext,
  type CarouselApi 
} from '@/components/ui/carousel'
import { FontSelector } from '@/components/builder/FontSelector'
import { getVariants } from '@/components/builder/registry'
import { useState } from 'react'

interface HeroSettingsProps {
  theme: ThemeConfig
  variant: string
  onThemeChange: (theme: ThemeConfig) => void
  onVariantChange: (variant: string) => void
}

export function HeroSettings({ 
  theme, 
  variant, 
  onThemeChange, 
  onVariantChange 
}: HeroSettingsProps) {
  const heroVariants = getVariants('hero')
  const [api, setApi] = useState<CarouselApi>()
  
  // Find current variant index
  const currentIndex = heroVariants.indexOf(variant)

  // Sync carousel with variant changes
  useEffect(() => {
    if (!api) return
    if (currentIndex >= 0) {
      api.scrollTo(currentIndex)
    }
  }, [api, currentIndex])

  // Handle carousel slide change
  const onSelect = useCallback(() => {
    if (!api) return
    const selectedIndex = api.selectedScrollSnap()
    const selectedVariant = heroVariants[selectedIndex]
    if (selectedVariant && selectedVariant !== variant) {
      onVariantChange(selectedVariant)
    }
  }, [api, heroVariants, variant, onVariantChange])

  useEffect(() => {
    if (!api) return
    api.on('select', onSelect)
    return () => {
      api.off('select', onSelect)
    }
  }, [api, onSelect])

  return (
    <div className="space-y-4">
      {/* Layout Variant Carousel */}
      <div className="grid gap-2">
        <Label>Layout</Label>
        <Carousel setApi={setApi} opts={{ loop: true }}>
          <div className="flex items-center justify-between p-2 rounded-md border bg-muted/50">
            <CarouselPrevious className="static translate-y-0 size-7" />
            <CarouselContent className="flex-1 mx-2">
              {heroVariants.map((v) => (
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
      </div>

      {/* Font Family */}
      <div className="grid gap-2">
        <Label>Font Family</Label>
        <FontSelector 
          value={theme.headingFontFamily}
          onChange={(font) => onThemeChange({ ...theme, headingFontFamily: font })}
        />
      </div>

      {/* Uppercase Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="uppercase-hero">Uppercase Titles</Label>
        <Switch
          id="uppercase-hero"
          checked={theme.uppercaseTitles}
          onCheckedChange={(checked) => onThemeChange({ ...theme, uppercaseTitles: checked })}
        />
      </div>
    </div>
  )
}
