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
  label?: string
}

/**
 * Font selector dropdown with categorized Google Fonts
 * Categories: Luxury, Modern, Corporate, Lifestyle
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
        <SelectContent className="max-h-80">
          {Object.entries(fontsByCategory).map(([category, fonts]) => (
            <SelectGroup key={category}>
              <SelectLabel className="text-xs font-semibold text-foreground pt-2">
                {categoryInfo[category]?.label || category}
                <span className="block text-[10px] font-normal text-muted-foreground">
                  {categoryInfo[category]?.description}
                </span>
              </SelectLabel>
              {fonts.map((font) => (
                <SelectItem 
                  key={font.value} 
                  value={font.value}
                  className="cursor-pointer py-2"
                >
                  <div className="flex flex-col">
                    <span style={{ fontFamily: font.value }}>
                      {font.name}
                    </span>
                    {font.description && (
                      <span className="text-[10px] text-muted-foreground">
                        {font.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
