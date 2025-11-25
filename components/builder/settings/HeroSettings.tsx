'use client'

import { ThemeConfig } from '@/types/builder'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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
    <div className="space-y-4">
      {/* Layout Variant */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Layout
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="flex flex-wrap gap-2">
            {heroVariants.map(v => (
              <Button
                key={v}
                size="sm"
                variant={variant === v ? 'default' : 'outline'}
                onClick={() => onVariantChange(v)}
                className="capitalize"
              >
                {v}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Font Family */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Font Family
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <FontSelector 
            value={theme.headingFontFamily}
            onChange={(font) => onThemeChange({ ...theme, headingFontFamily: font })}
          />
        </CardContent>
      </Card>

      {/* Font Size */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex justify-between">
            <span>Font Size</span>
            <span className="font-mono text-foreground">
              {Math.round(theme.headingFontSize * 100)}%
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <Slider
            value={[theme.headingFontSize]}
            onValueChange={([value]) => onThemeChange({ ...theme, headingFontSize: value })}
            min={0.7}
            max={1.3}
            step={0.05}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Letter Spacing */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex justify-between">
            <span>Letter Spacing</span>
            <span className="font-mono text-foreground">
              {theme.headingLetterSpacing > 0 ? '+' : ''}{theme.headingLetterSpacing.toFixed(2)}em
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <Slider
            value={[theme.headingLetterSpacing]}
            onValueChange={([value]) => onThemeChange({ ...theme, headingLetterSpacing: value })}
            min={-0.05}
            max={0.15}
            step={0.01}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Uppercase Toggle */}
      <Card className="bg-muted/50">
        <CardContent className="px-3 py-3">
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
        </CardContent>
      </Card>
    </div>
  )
}

