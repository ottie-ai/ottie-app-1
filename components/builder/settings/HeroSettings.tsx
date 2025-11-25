'use client'

import { ThemeConfig } from '@/types/builder'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FontSelector } from '@/components/builder/FontSelector'
import { getVariants } from '@/components/builder/registry'

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

  return (
    <div className="space-y-6">
      {/* Layout Variant */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Layout
        </Label>
        <Select value={variant} onValueChange={onVariantChange}>
          <SelectTrigger className="w-full capitalize">
            <SelectValue placeholder="Select layout" />
          </SelectTrigger>
          <SelectContent>
            {heroVariants.map(v => (
              <SelectItem key={v} value={v} className="capitalize">
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Font Family
        </Label>
        <FontSelector 
          value={theme.headingFontFamily}
          onChange={(font) => onThemeChange({ ...theme, headingFontFamily: font })}
        />
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Font Size
          </Label>
          <span className="text-xs font-mono text-foreground">
            {Math.round(theme.headingFontSize * 100)}%
          </span>
        </div>
        <Slider
          value={[theme.headingFontSize]}
          onValueChange={([value]) => onThemeChange({ ...theme, headingFontSize: value })}
          min={0.7}
          max={1.3}
          step={0.05}
          className="w-full"
        />
      </div>

      {/* Letter Spacing */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Letter Spacing
          </Label>
          <span className="text-xs font-mono text-foreground">
            {theme.headingLetterSpacing > 0 ? '+' : ''}{theme.headingLetterSpacing.toFixed(2)}em
          </span>
        </div>
        <Slider
          value={[theme.headingLetterSpacing]}
          onValueChange={([value]) => onThemeChange({ ...theme, headingLetterSpacing: value })}
          min={-0.05}
          max={0.15}
          step={0.01}
          className="w-full"
        />
      </div>

      {/* Uppercase Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="uppercase-hero" className="text-sm cursor-pointer">
          Uppercase Titles
        </Label>
        <Switch
          id="uppercase-hero"
          checked={theme.uppercaseTitles}
          onCheckedChange={(checked) => onThemeChange({ ...theme, uppercaseTitles: checked })}
        />
      </div>
    </div>
  )
}
