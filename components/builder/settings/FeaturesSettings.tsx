'use client'

import { useEffect, useCallback, useState } from 'react'
import { FeaturesSectionData, ColorScheme } from '@/types/builder'
import { 
  Field, 
  FieldGroup, 
  FieldLabel 
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DestructiveButton } from '@/components/ui/destructive-button'
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselPrevious, 
  CarouselNext,
  type CarouselApi 
} from '@/components/ui/carousel'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { IconPicker, Icon, type IconName } from '@/components/ui/icon-picker'
import { getVariants } from '@/components/templates/registry'
import { Sun, Moon, Plus, Trash2 } from 'lucide-react'
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
            ? 'bg-background text-foreground border-border shadow-sm' 
            : 'bg-muted border-border hover:bg-accent text-muted-foreground'
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
            ? 'bg-background text-foreground border-border shadow-sm' 
            : 'bg-muted border-border hover:bg-accent text-muted-foreground'
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
  data,
  colorScheme = 'light',
  onVariantChange,
  onDataChange,
  onColorSchemeChange,
}: FeaturesRemixPanelProps) {
  const featuresVariants = getVariants('features')
  const [api, setApi] = useState<CarouselApi>()
  const features = data.features || []
  const maxFeatures = 12
  
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

  const addFeature = () => {
    if (features.length >= maxFeatures) return
    const newFeature = {
      label: '',
      value: '',
      icon: undefined,
    }
    onDataChange({
      ...data,
      features: [...features, newFeature],
    })
  }

  const removeFeature = (index: number) => {
    const updated = features.filter((_, i) => i !== index)
    onDataChange({
      ...data,
      features: updated,
    })
  }

  const updateFeature = (index: number, updates: Partial<typeof features[0]>) => {
    const updated = features.map((feature, i) => 
      i === index ? { ...feature, ...updates } : feature
    )
    onDataChange({
      ...data,
      features: updated,
    })
  }

  return (
    <FieldGroup className="gap-5">
      <Field>
        <FieldLabel>Layout</FieldLabel>
        <Carousel setApi={setApi} opts={{ loop: true }}>
          <div className="flex items-center justify-between p-2 rounded-md border bg-muted">
            <CarouselPrevious 
              className="static translate-y-0 size-7 text-foreground hover:text-foreground border rounded-full shadow-sm disabled:opacity-100 disabled:border-border disabled:text-muted-foreground bg-background" 
            />
            <CarouselContent className="flex-1 mx-2">
              {featuresVariants.map((v) => (
                <CarouselItem key={v} className="pl-0">
                  <div className="flex items-center justify-center">
                    <span className="text-sm font-medium capitalize text-foreground">{v}</span>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselNext 
              className="static translate-y-0 size-7 text-foreground hover:text-foreground border rounded-full shadow-sm disabled:opacity-100 disabled:border-border disabled:text-muted-foreground bg-background" 
            />
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

      <Field>
        <div className="flex items-center justify-between">
          <FieldLabel>Features</FieldLabel>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFeature}
            disabled={features.length >= maxFeatures}
          >
            <Plus className="size-4 mr-2" />
            Add Feature
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {features.length} / {maxFeatures} features
        </p>
        
        <Accordion type="single" collapsible className="w-full">
          {features.map((feature, index) => {
            return (
              <AccordionItem key={index} value={`feature-${index}`}>
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {feature.icon && (
                      <Icon name={feature.icon as IconName} className="size-4" />
                    )}
                    <span>
                      {feature.label || `Feature ${index + 1}`}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <FieldGroup className="gap-4 pt-2">
                    <Field>
                      <FieldLabel>Label</FieldLabel>
                      <Input
                        value={feature.label || ''}
                        onChange={(e) => updateFeature(index, { label: e.target.value })}
                        placeholder="Enter label"
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Value</FieldLabel>
                      <Input
                        value={feature.value || ''}
                        onChange={(e) => updateFeature(index, { value: e.target.value })}
                        placeholder="Enter value"
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Icon</FieldLabel>
                      <IconPicker
                        value={feature.icon as IconName | undefined}
                        onValueChange={(value) => updateFeature(index, { icon: value || undefined })}
                        triggerPlaceholder="Select icon"
                      />
                    </Field>

                    <DestructiveButton
                      type="button"
                      size="sm"
                      onClick={() => removeFeature(index)}
                      className="w-full"
                    >
                      <Trash2 className="size-4 mr-2" />
                      Remove Feature
                    </DestructiveButton>
                  </FieldGroup>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </Field>
    </FieldGroup>
  )
}

