'use client'

import { useEffect, useCallback, useState } from 'react'
import { ThemeConfig, HeroSectionData } from '@/types/builder'
import { Switch } from '@/components/ui/switch'
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
import { FontSelector } from '@/components/builder/FontSelector'
import { FileUpload } from '@/components/ui/file-upload'
import { getVariants } from '@/components/builder/registry'

// ============================================
// Remix Panel - Layout & Background Image
// ============================================

interface HeroRemixPanelProps {
  variant: string
  data: HeroSectionData
  onVariantChange: (variant: string) => void
  onDataChange: (data: HeroSectionData) => void
}

export function HeroRemixPanel({ 
  variant, 
  data,
  onVariantChange,
  onDataChange
}: HeroRemixPanelProps) {
  const heroVariants = getVariants('hero')
  const [api, setApi] = useState<CarouselApi>()
  
  const currentIndex = heroVariants.indexOf(variant)

  useEffect(() => {
    if (!api) return
    if (currentIndex >= 0) {
      api.scrollTo(currentIndex)
    }
  }, [api, currentIndex])

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
    <FieldGroup className="gap-5">
      <Field>
        <FieldLabel>Layout</FieldLabel>
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
      </Field>

      <Field>
        <FieldLabel>Background Image</FieldLabel>
        <FileUpload
          value={data.backgroundImage}
          onChange={(value) => onDataChange({ ...data, backgroundImage: value ?? undefined })}
          placeholder="Drop an image or click to upload"
        />
      </Field>
    </FieldGroup>
  )
}

// ============================================
// Settings Panel - Font & Typography
// ============================================

interface HeroSettingsPanelProps {
  theme: ThemeConfig
  onThemeChange: (theme: ThemeConfig) => void
}

export function HeroSettingsPanel({ 
  theme, 
  onThemeChange
}: HeroSettingsPanelProps) {
  return (
    <FieldGroup className="gap-5">
      <Field>
        <FieldLabel>Font Family</FieldLabel>
          <FontSelector 
            value={theme.headingFontFamily}
            onChange={(font) => onThemeChange({ ...theme, headingFontFamily: font })}
          />
      </Field>

      <Field orientation="horizontal">
        <FieldLabel htmlFor="uppercase-hero">Uppercase Titles</FieldLabel>
            <Switch
              id="uppercase-hero"
              checked={theme.uppercaseTitles}
              onCheckedChange={(checked) => onThemeChange({ ...theme, uppercaseTitles: checked })}
            />
      </Field>
    </FieldGroup>
  )
}
