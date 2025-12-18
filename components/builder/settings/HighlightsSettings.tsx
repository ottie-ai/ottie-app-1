'use client'

import { useState, useEffect, useCallback } from 'react'
import { HighlightsSectionData, ColorScheme } from '@/types/builder'
import { 
  Field, 
  FieldGroup, 
  FieldLabel 
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { DestructiveButton } from '@/components/ui/destructive-button'
import { FileUpload } from '@/components/ui/file-upload'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { IconPicker, Icon, type IconName } from '@/components/ui/icon-picker'
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselPrevious, 
  CarouselNext,
  type CarouselApi 
} from '@/components/ui/carousel'
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
// Remix Panel - Highlights
// ============================================

interface HighlightsRemixPanelProps {
  variant: string
  data: HighlightsSectionData
  colorScheme?: ColorScheme
  siteId: string // REQUIRED: Site ID for image uploads to Supabase Storage
  onVariantChange: (variant: string) => void
  onDataChange: (data: HighlightsSectionData) => void
  onImageAutoSave?: () => void // Auto-save callback for image changes
  onColorSchemeChange?: (colorScheme: ColorScheme) => void
}

export function HighlightsRemixPanel({ 
  variant,
  data,
  colorScheme = 'light',
  siteId,
  onVariantChange,
  onDataChange,
  onImageAutoSave,
  onColorSchemeChange,
}: HighlightsRemixPanelProps) {
  const highlightsVariants = getVariants('highlights')
  const [api, setApi] = useState<CarouselApi>()
  const highlights = data.highlights || []
  const maxCards = 6
  
  const currentIndex = highlightsVariants.indexOf(variant)

  useEffect(() => {
    if (!api) return
    if (currentIndex >= 0) {
      api.scrollTo(currentIndex)
    }
  }, [api, currentIndex])

  const onSelect = useCallback(() => {
    if (!api) return
    const selectedIndex = api.selectedScrollSnap()
    const selectedVariant = highlightsVariants[selectedIndex]
    if (selectedVariant && selectedVariant !== variant) {
      onVariantChange(selectedVariant)
    }
  }, [api, highlightsVariants, variant, onVariantChange])

  useEffect(() => {
    if (!api) return
    api.on('select', onSelect)
    return () => {
      api.off('select', onSelect)
    }
  }, [api, onSelect])

  const addCard = () => {
    if (highlights.length >= maxCards) return
    const newCard = {
      title: '',
      text: '',
      number: '',
      image: undefined,
      icon: undefined,
    }
    onDataChange({
      ...data,
      highlights: [...highlights, newCard],
    })
  }

  const removeCard = (index: number) => {
    const updated = highlights.filter((_, i) => i !== index)
    onDataChange({
      ...data,
      highlights: updated,
    })
  }

  const updateCard = (index: number, updates: Partial<typeof highlights[0]>) => {
    const updated = highlights.map((card, i) => 
      i === index ? { ...card, ...updates } : card
    )
    onDataChange({
      ...data,
      highlights: updated,
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
              {highlightsVariants.map((v) => (
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
          <FieldLabel>Highlight Cards</FieldLabel>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCard}
            disabled={highlights.length >= maxCards}
          >
            <Plus className="size-4 mr-2" />
            Add Card
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {highlights.length} / {maxCards} cards
        </p>
        
        <Accordion type="single" collapsible className="w-full">
          {highlights.map((card, index) => {
            return (
              <AccordionItem key={index} value={`card-${index}`}>
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {card.icon && (
                      <Icon name={card.icon as IconName} className="size-4" />
                    )}
                    <span>
                      {card.title || `Card ${index + 1}`}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <FieldGroup className="gap-4 pt-2">
                    <Field>
                      <FieldLabel>Title</FieldLabel>
                      <Input
                        value={card.title || ''}
                        onChange={(e) => updateCard(index, { title: e.target.value })}
                        placeholder="Enter title"
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Subtitle</FieldLabel>
                      <Textarea
                        value={card.text || ''}
                        onChange={(e) => updateCard(index, { text: e.target.value })}
                        placeholder="Enter subtitle"
                        rows={3}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Number</FieldLabel>
                      <Input
                        value={card.number || ''}
                        onChange={(e) => updateCard(index, { number: e.target.value })}
                        placeholder="Enter number"
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Icon</FieldLabel>
                      <IconPicker
                        value={card.icon as IconName | undefined}
                        onValueChange={(value) => updateCard(index, { icon: value || undefined })}
                        triggerPlaceholder="Select icon"
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Photo</FieldLabel>
                      <FileUpload
                        value={card.image}
                        onChange={(value) => {
                          updateCard(index, { image: value ?? undefined })
                          // Auto-save after image change
                          if (onImageAutoSave) {
                            setTimeout(() => onImageAutoSave(), 100)
                          }
                        }}
                        placeholder="Drop an image or click to upload"
                        siteId={siteId}
                      />
                    </Field>

                    <DestructiveButton
                      type="button"
                      size="sm"
                      onClick={() => removeCard(index)}
                      className="w-full"
                    >
                      <Trash2 className="size-4 mr-2" />
                      Remove Card
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

