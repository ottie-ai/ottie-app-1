'use client'

import { useState } from 'react'
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
import { IconPicker } from '@/components/ui/icon-picker'
import { Sun, Moon, Plus, Trash2 } from 'lucide-react'
import { Bed, Bathtub, Ruler, Car, House, Tree, SwimmingPool, WifiHigh, Fan, Fire, Television, ForkKnife, IconProps } from '@phosphor-icons/react'
import { ComponentType } from 'react'
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

// Icon mapping for Phosphor icons
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

const iconOptions = [
  { value: 'bed', label: 'Bed' },
  { value: 'bath', label: 'Bath' },
  { value: 'ruler', label: 'Ruler' },
  { value: 'car', label: 'Car' },
  { value: 'home', label: 'Home' },
  { value: 'trees', label: 'Trees' },
  { value: 'pool', label: 'Pool' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'ac', label: 'AC' },
  { value: 'heating', label: 'Heating' },
  { value: 'tv', label: 'TV' },
  { value: 'kitchen', label: 'Kitchen' },
]

// ============================================
// Remix Panel - Highlights
// ============================================

interface HighlightsRemixPanelProps {
  variant: string
  data: HighlightsSectionData
  colorScheme?: ColorScheme
  onVariantChange: (variant: string) => void
  onDataChange: (data: HighlightsSectionData) => void
  onColorSchemeChange?: (colorScheme: ColorScheme) => void
}

export function HighlightsRemixPanel({ 
  variant,
  data,
  colorScheme = 'light',
  onVariantChange,
  onDataChange,
  onColorSchemeChange,
}: HighlightsRemixPanelProps) {
  const highlights = data.highlights || []
  const maxCards = 6

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
            const IconComponent = card.icon ? iconMap[card.icon.toLowerCase()] : null
            return (
              <AccordionItem key={index} value={`card-${index}`}>
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {IconComponent && (
                      <IconComponent className="size-4" weight="light" />
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
                        value={card.icon}
                        onChange={(value) => updateCard(index, { icon: value })}
                        iconMap={iconMap}
                        iconOptions={iconOptions}
                        placeholder="Select icon"
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Photo</FieldLabel>
                      <FileUpload
                        value={card.image}
                        onChange={(value) => updateCard(index, { image: value ?? undefined })}
                        placeholder="Drop an image or click to upload"
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

