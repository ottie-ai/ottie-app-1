'use client'

import { getFontsByCategory, categoryInfo } from '@/lib/fonts'
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
}

/**
 * Font selector dropdown with categorized Google Fonts
 */
export function FontSelector({ value, onChange }: FontSelectorProps) {
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
            {fonts.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
