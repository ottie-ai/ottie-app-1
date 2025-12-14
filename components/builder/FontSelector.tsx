'use client'

import { getFontsByCategory, categoryInfo } from '@/lib/fonts'
import { useAppData } from '@/contexts/app-context'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Crown } from 'lucide-react'

interface FontSelectorProps {
  value: string
  onChange: (value: string) => void
}

/**
 * Font selector dropdown with categorized Google Fonts and Premium Fonts
 * Premium fonts are only available to users with feature_premium_fonts plan feature
 */
export function FontSelector({ value, onChange }: FontSelectorProps) {
  const { currentWorkspace, hasPlanFeature } = useAppData()
  const hasPremiumFonts = currentWorkspace 
    ? hasPlanFeature(currentWorkspace.plan, 'feature_premium_fonts')
    : false
  
  const fontsByCategory = getFontsByCategory()
  
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a font" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(fontsByCategory).map(([category, fonts]) => (
          <SelectGroup key={category}>
            <SelectLabel>
              {categoryInfo[category]?.label || category}
            </SelectLabel>
            {fonts.map((font) => {
              const isPremium = font.isPremium === true
              const hasAccess = !isPremium || hasPremiumFonts
              
              return (
                <SelectItem 
                  key={font.value} 
                  value={font.value}
                  disabled={!hasAccess}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="flex-1">{font.name}</span>
                    {isPremium && (
                      <Badge 
                        variant={hasAccess ? "default" : "outline"}
                        className="text-xs shrink-0"
                      >
                        <Crown className="size-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              )
            })}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
