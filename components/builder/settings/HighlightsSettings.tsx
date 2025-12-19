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
import { FileUpload } from '@/components/ui/file-upload'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { IconPicker, Icon, type IconName } from '@/components/ui/icon-picker'
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselPrevious, 
  CarouselNext,
  type CarouselApi 
} from '@/components/ui/carousel'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getVariants } from '@/components/templates/registry'
import { Sun, Moon, Plus, X, GripVertical, ChevronDown } from 'lucide-react'
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
// Sortable Card Component
// ============================================

interface SortableCardProps {
  card: {
    title?: string
    text?: string
    image?: string
    icon?: string
  }
  index: number
  isOpen: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<SortableCardProps['card']>) => void
  onRemove: () => void
  siteId: string
  onImageAutoSave?: () => void
}

function SortableCard({ 
  card, 
  index, 
  isOpen, 
  onToggle, 
  onUpdate, 
  onRemove,
  siteId,
  onImageAutoSave,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `card-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg bg-background"
    >
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center gap-2 p-3 hover:bg-accent/50 transition-colors">
            <div
              {...attributes}
              {...listeners}
              className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="size-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {card.icon && (
                <Icon name={card.icon as IconName} className="size-4 flex-shrink-0" />
              )}
              <span className="text-sm font-medium truncate">
                {card.title || `Card ${index + 1}`}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove()
                }}
                className="p-1 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="size-4" />
              </button>
              <ChevronDown 
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )} 
              />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-2 border-t">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={card.title || ''}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  placeholder="Enter title"
                />
              </Field>

              <Field>
                <FieldLabel>Subtitle</FieldLabel>
                <Textarea
                  value={card.text || ''}
                  onChange={(e) => onUpdate({ text: e.target.value })}
                  placeholder="Enter subtitle"
                  rows={3}
                />
              </Field>

              <Field>
                <FieldLabel>Icon</FieldLabel>
                <IconPicker
                  value={card.icon as IconName | undefined}
                  onValueChange={(value) => onUpdate({ icon: value || undefined })}
                  triggerPlaceholder="Select icon"
                />
              </Field>

              <Field>
                <FieldLabel>Photo</FieldLabel>
                <FileUpload
                  value={card.image}
                  onChange={(value) => onUpdate({ image: value ?? undefined })}
                  onImageSaved={onImageAutoSave}
                  placeholder="Drop an image or click to upload"
                  siteId={siteId}
                />
              </Field>
            </FieldGroup>
          </div>
        </CollapsibleContent>
      </Collapsible>
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
  const [openCards, setOpenCards] = useState<Set<number>>(new Set())
  
  const currentIndex = highlightsVariants.indexOf(variant)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
      image: undefined,
      icon: undefined,
    }
    onDataChange({
      ...data,
      highlights: [...highlights, newCard],
    })
    // Open the new card automatically
    setOpenCards(new Set([...openCards, highlights.length]))
  }

  const removeCard = (index: number) => {
    const updated = highlights.filter((_, i) => i !== index)
    const newOpenCards = new Set<number>()
    openCards.forEach((openIndex) => {
      if (openIndex < index) {
        newOpenCards.add(openIndex)
      } else if (openIndex > index) {
        newOpenCards.add(openIndex - 1)
      }
    })
    setOpenCards(newOpenCards)
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const activeId = String(active.id)
      const overId = String(over.id)
      
      if (activeId.startsWith('card-') && overId.startsWith('card-')) {
        const oldIndex = parseInt(activeId.replace('card-', ''), 10)
        const newIndex = parseInt(overId.replace('card-', ''), 10)

        if (!isNaN(oldIndex) && !isNaN(newIndex) && oldIndex !== newIndex) {
          const newHighlights = arrayMove(highlights, oldIndex, newIndex)
          
          // Update open cards indices after reordering
          const newOpenCards = new Set<number>()
          openCards.forEach((openIndex) => {
            if (openIndex === oldIndex) {
              // The dragged card moves to newIndex
              newOpenCards.add(newIndex)
            } else if (oldIndex < newIndex) {
              // Moving down: cards between oldIndex+1 and newIndex shift up
              if (openIndex > oldIndex && openIndex <= newIndex) {
                newOpenCards.add(openIndex - 1)
              } else {
                newOpenCards.add(openIndex)
              }
            } else {
              // Moving up: cards between newIndex and oldIndex-1 shift down
              if (openIndex >= newIndex && openIndex < oldIndex) {
                newOpenCards.add(openIndex + 1)
              } else {
                newOpenCards.add(openIndex)
              }
            }
          })
          setOpenCards(newOpenCards)
          
          onDataChange({
            ...data,
            highlights: newHighlights,
          })
        }
      }
    }
  }

  const toggleCard = (index: number) => {
    const newOpenCards = new Set(openCards)
    if (newOpenCards.has(index)) {
      newOpenCards.delete(index)
    } else {
      newOpenCards.add(index)
    }
    setOpenCards(newOpenCards)
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
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={highlights.map((_, index) => `card-${index}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {highlights.map((card, index) => (
                <SortableCard
                  key={`card-${index}`}
                  card={card}
                  index={index}
                  isOpen={openCards.has(index)}
                  onToggle={() => toggleCard(index)}
                  onUpdate={(updates) => updateCard(index, updates)}
                  onRemove={() => removeCard(index)}
                  siteId={siteId}
                  onImageAutoSave={onImageAutoSave}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </Field>
    </FieldGroup>
  )
}
