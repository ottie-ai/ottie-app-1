'use client'

import { useEffect, useCallback, useState } from 'react'
import { ThemeConfig, HeroSectionData, CTAType, ColorScheme } from '@/types/builder'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Field, 
  FieldGroup, 
  FieldLabel,
  FieldSeparator
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
import { FontSelector } from '@/components/builder/FontSelector'
import { FileUpload } from '@/components/ui/file-upload'
import { getVariants } from '@/components/templates/registry'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SitePasswordSettings } from '@/components/site-password-settings'
import type { TitleCase } from '@/lib/text-case'
import { useAppData } from '@/contexts/app-context'
import { getFirstPlanWithFeature } from '@/lib/data/plans'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import { PricingDialog } from '@/components/workspace/pricing-dialog'
import { Button } from '@/components/ui/button'

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
// Remix Panel - Layout & Background Image
// ============================================

interface HeroRemixPanelProps {
  variant: string
  data: HeroSectionData
  colorScheme?: ColorScheme
  siteId: string // REQUIRED: Site ID for image uploads to Supabase Storage
  onVariantChange: (variant: string) => void
  onDataChange: (data: HeroSectionData) => void
  onImageAutoSave?: () => void // Auto-save callback for image changes
  onColorSchemeChange?: (colorScheme: ColorScheme) => void
}

export function HeroRemixPanel({ 
  variant, 
  data,
  colorScheme = 'dark',
  siteId,
  onVariantChange,
  onDataChange,
  onImageAutoSave,
  onColorSchemeChange
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
          <div className="flex items-center justify-between p-2 rounded-md border bg-muted">
            <CarouselPrevious 
              className="static translate-y-0 size-7 text-foreground hover:text-foreground border rounded-full shadow-sm disabled:opacity-100 disabled:border-border disabled:text-muted-foreground bg-background" 
            />
            <CarouselContent className="flex-1 mx-2">
              {heroVariants.map((v) => (
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
        <FieldLabel>Title</FieldLabel>
        <Input
          value={data.headline || ''}
          onChange={(e) => onDataChange({ ...data, headline: e.target.value })}
          placeholder="Enter title"
        />
      </Field>

      <Field>
        <FieldLabel>Subtitle</FieldLabel>
        <Textarea
          value={data.subheadline || ''}
          onChange={(e) => onDataChange({ ...data, subheadline: e.target.value })}
          placeholder="Enter subtitle"
          rows={3}
        />
      </Field>

      <Field>
        <FieldLabel>Color Scheme</FieldLabel>
        <ColorSchemeSelector 
          value={colorScheme} 
          onChange={(cs) => onColorSchemeChange?.(cs)} 
        />
      </Field>

      <Field>
        <FieldLabel>Hero Image</FieldLabel>
        <FileUpload
          value={data.propertyImage}
          onChange={(value) => onDataChange({ ...data, propertyImage: value ?? undefined })}
          onImageSaved={onImageAutoSave}
          placeholder="Drop an image or click to upload"
          siteId={siteId}
        />
      </Field>
    </FieldGroup>
  )
}

// ============================================
// Site Settings Panel - Global settings for the entire site
// ============================================

interface PageSettingsPanelProps {
  theme: ThemeConfig
  onThemeChange: (theme: ThemeConfig) => void
  siteId?: string // Optional site ID for password protection
  passwordProtected?: boolean // Whether site is password protected
  onPasswordUpdate?: () => void // Callback when password is updated
}

const ctaOptions: { value: CTAType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
]

const ctaPlaceholders: Record<CTAType, string> = {
  none: '',
  whatsapp: '+1234567890',
  phone: '+1234567890',
  email: 'hello@example.com',
}

export function PageSettingsPanel({ 
  theme, 
  onThemeChange,
  siteId,
  passwordProtected,
  onPasswordUpdate
}: PageSettingsPanelProps) {
  const { currentWorkspace, plans, hasPlanFeature } = useAppData()
  
  // Check if workspace has custom cursor feature
  const hasCustomCursorFeature = currentWorkspace 
    ? hasPlanFeature(currentWorkspace.plan, 'feature_custom_cursor')
    : false
  
  // Find the lowest plan with custom cursor feature
  const lowestPlanWithFeature = getFirstPlanWithFeature(plans, 'feature_custom_cursor')
  
  // Check if workspace has text animations feature
  const hasTextAnimationsFeature = currentWorkspace 
    ? hasPlanFeature(currentWorkspace.plan, 'feature_text_animations')
    : false
  
  // Find the lowest plan with text animations feature
  const lowestTextAnimationsPlan = getFirstPlanWithFeature(plans, 'feature_text_animations')
  
  // Ensure theme has all required properties
  const safeTheme = theme || {
    fontFamily: 'Inter',
    headingFontFamily: 'Inter',
    headingFontSize: 1,
    headingLetterSpacing: 0,
    titleCase: 'sentence' as TitleCase,
    primaryColor: '#000000',
    secondaryColor: '#666666',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    borderRadius: 'md',
    ctaType: 'none',
    ctaValue: '',
    cursorStyle: 'none', // Default to 'none' if feature not available
  }
  
  // If workspace doesn't have features, ensure defaults are set
  const effectiveTheme = {
    ...safeTheme,
    cursorStyle: hasCustomCursorFeature ? safeTheme.cursorStyle : ('none' as const),
    animationStyle: hasTextAnimationsFeature ? safeTheme.animationStyle : ('none' as const),
  }
  
  const ctaType = effectiveTheme.ctaType || 'whatsapp'
  
  return (
    <FieldGroup className="gap-5">
      <Field>
        <FieldLabel>Font Family</FieldLabel>
          <FontSelector 
            value={safeTheme.headingFontFamily}
            onChange={(font) => onThemeChange({ ...safeTheme, headingFontFamily: font })}
          />
      </Field>

      <Field>
        <FieldLabel>Title Case</FieldLabel>
        <Select 
          value={safeTheme.titleCase || 'sentence'}
          onValueChange={(value: 'uppercase' | 'title' | 'sentence') => {
            const updatedTheme = { ...safeTheme }
            updatedTheme.titleCase = value
            onThemeChange(updatedTheme)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select title case" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sentence">Sentence Case</SelectItem>
            <SelectItem value="title">Title Case</SelectItem>
            <SelectItem value="uppercase">Uppercase</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Text Animations</FieldLabel>
        <Select 
          value={effectiveTheme.animationStyle || 'none'}
          onValueChange={(value: 'blur' | 'fade-in' | 'slide-up' | 'none') => {
            const updatedTheme = { ...effectiveTheme }
            updatedTheme.animationStyle = value
            onThemeChange(updatedTheme)
          }}
          disabled={!hasTextAnimationsFeature}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select animation style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="blur">Blur</SelectItem>
            <SelectItem value="fade-in">Fade In</SelectItem>
            <SelectItem value="slide-up">Slide Up</SelectItem>
          </SelectContent>
        </Select>
        {!hasTextAnimationsFeature && lowestTextAnimationsPlan && (
          <Alert className="mt-2">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Text animations are available on the {lowestTextAnimationsPlan.name.charAt(0).toUpperCase() + lowestTextAnimationsPlan.name.slice(1)} plan and above.
              <PricingDialog
                currentPlan={currentWorkspace?.plan}
                stripeCustomerId={currentWorkspace?.stripe_customer_id}
                workspaceId={currentWorkspace?.id}
                defaultSelectedTier={lowestTextAnimationsPlan.name}
              >
                <Button variant="link" className="h-auto p-0 ml-1 text-primary underline">
                  Upgrade now
                </Button>
              </PricingDialog>
            </AlertDescription>
          </Alert>
        )}
      </Field>

      <Field>
        <FieldLabel>Cursor Style</FieldLabel>
        <Select 
          value={effectiveTheme.cursorStyle || 'none'}
          onValueChange={(value: 'none' | 'frosty' | 'circle') => {
            const updatedTheme = { ...effectiveTheme }
            updatedTheme.cursorStyle = value
            onThemeChange(updatedTheme)
          }}
          disabled={!hasCustomCursorFeature}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select cursor style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="frosty">Frosty</SelectItem>
            <SelectItem value="circle">Circle</SelectItem>
          </SelectContent>
        </Select>
        {!hasCustomCursorFeature && lowestPlanWithFeature && (
          <Alert className="mt-2">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Custom cursor is available on the {lowestPlanWithFeature.name.charAt(0).toUpperCase() + lowestPlanWithFeature.name.slice(1)} plan and above.
              <PricingDialog
                currentPlan={currentWorkspace?.plan}
                stripeCustomerId={currentWorkspace?.stripe_customer_id}
                workspaceId={currentWorkspace?.id}
                defaultSelectedTier={lowestPlanWithFeature.name}
              >
                <Button variant="link" className="h-auto p-0 ml-1 text-primary underline">
                  Upgrade now
                </Button>
              </PricingDialog>
            </AlertDescription>
          </Alert>
        )}
      </Field>

      <FieldSeparator />

      <Field>
        <FieldLabel>Floating CTA Button</FieldLabel>
        <Select 
          value={ctaType} 
          onValueChange={(value: CTAType) => onThemeChange({ ...safeTheme, ctaType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select CTA type" />
          </SelectTrigger>
          <SelectContent>
            {ctaOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {ctaType !== 'none' && (
        <Field>
          <FieldLabel>
            {ctaType === 'whatsapp' ? 'WhatsApp Number' : 
             ctaType === 'phone' ? 'Phone Number' : 'Email Address'}
          </FieldLabel>
          <Input
            type={ctaType === 'email' ? 'email' : 'tel'}
            value={safeTheme.ctaValue || ''}
            onChange={(e) => onThemeChange({ ...safeTheme, ctaValue: e.target.value })}
            placeholder={ctaPlaceholders[ctaType]}
          />
        </Field>
      )}

      {siteId && (
        <SitePasswordSettings
          siteId={siteId}
          passwordProtected={passwordProtected ?? false}
          onUpdate={onPasswordUpdate}
        />
      )}
    </FieldGroup>
  )
}
