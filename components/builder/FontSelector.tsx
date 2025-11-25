'use client'

import { headingFonts, getFontsByCategory, FontOption } from '@/lib/fonts'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FontSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

const categoryLabels: Record<string, string> = {
  'serif': 'Serif',
  'sans-serif': 'Sans Serif',
  'display': 'Display',
  'handwriting': 'Handwriting',
}

/**
 * Font selector dropdown with categorized Google Fonts
 */
export function FontSelector({ value, onChange, label }: FontSelectorProps) {
  const fontsByCategory = getFontsByCategory()
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a font">
            <span style={{ fontFamily: value }}>{value}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(fontsByCategory).map(([category, fonts]) => (
            <SelectGroup key={category}>
              <SelectLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                {categoryLabels[category] || category}
              </SelectLabel>
              {fonts.map((font) => (
                <SelectItem 
                  key={font.value} 
                  value={font.value}
                  className="cursor-pointer"
                >
                  <span style={{ fontFamily: font.value }}>
                    {font.name}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

