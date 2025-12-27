'use client'

import { useEffect, useCallback, useState, useMemo } from 'react'
import { GallerySectionData, ColorScheme } from '@/types/builder'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getVariants } from '@/components/templates/registry'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImageUpload } from '@/components/ui/ImageUpload'
import type { ImageUploadResult } from '@/types/image'

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
// Remix Panel - Gallery
// ============================================

interface GalleryRemixPanelProps {
  variant: string
  data: GallerySectionData
  colorScheme?: ColorScheme
  siteId: string // REQUIRED: Site ID for image uploads to Supabase Storage
  onVariantChange: (variant: string) => void
  onDataChange: (data: GallerySectionData) => void
  onImageAutoSave?: () => void // Auto-save callback for image changes
  onColorSchemeChange?: (colorScheme: ColorScheme) => void
}

export function GalleryRemixPanel({ 
  variant,
  data,
  colorScheme = 'light',
  siteId,
  onVariantChange,
  onDataChange,
  onImageAutoSave,
  onColorSchemeChange,
}: GalleryRemixPanelProps) {
  const galleryVariants = getVariants('gallery')
  const [api, setApi] = useState<CarouselApi>()
  
  const currentIndex = galleryVariants.indexOf(variant)

  useEffect(() => {
    if (!api) return
    if (currentIndex >= 0) {
      api.scrollTo(currentIndex)
    }
  }, [api, currentIndex])

  const onSelect = useCallback(() => {
    if (!api) return
    const selectedIndex = api.selectedScrollSnap()
    const selectedVariant = galleryVariants[selectedIndex]
    if (selectedVariant && selectedVariant !== variant) {
      onVariantChange(selectedVariant)
    }
  }, [api, galleryVariants, variant, onVariantChange])

  useEffect(() => {
    if (!api) return
    api.on('select', onSelect)
    return () => {
      api.off('select', onSelect)
    }
  }, [api, onSelect])

  // Transform GallerySectionData images to ImageUploadResult format
  const imageUploadResults: ImageUploadResult[] = useMemo(() => {
    return data.images.map((img) => ({
      url: img.src,
      path: img.src.split('/').pop() || '',
      width: 0, // We don't store dimensions in gallery data
      height: 0,
      size: 0,
      format: img.src.split('.').pop() || 'webp',
    }))
  }, [data.images])

  // Handle image upload changes
  const handleImageUploadChange = useCallback((uploadedImages: ImageUploadResult[]) => {
    // Transform ImageUploadResult[] back to GallerySectionData format
    const galleryImages = uploadedImages.map((img) => {
      // Try to find existing image data to preserve alt and caption
      const existingImage = data.images.find((existing) => existing.src === img.url)
      return {
        src: img.url,
        alt: existingImage?.alt || '',
        caption: existingImage?.caption || '',
      }
    })
    onDataChange({ ...data, images: galleryImages })
    // Trigger auto-save after state update
    setTimeout(() => {
      onImageAutoSave?.()
    }, 100)
  }, [data, onDataChange, onImageAutoSave])

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
              {galleryVariants.map((v) => (
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
        <FieldLabel>Type</FieldLabel>
        <Select 
          value={data.type || 'simple'} 
          onValueChange={(value) => onDataChange({ ...data, type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="simple">Simple</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Images</FieldLabel>
        <ImageUpload
          siteId={siteId}
          value={imageUploadResults}
          onChange={handleImageUploadChange}
          maxFiles={50}
        />
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






