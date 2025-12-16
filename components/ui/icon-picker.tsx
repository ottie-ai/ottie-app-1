'use client'

import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { ComponentType } from 'react'
import { IconProps } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface IconOption {
  value: string
  label: string
  component: ComponentType<IconProps>
}

interface IconPickerProps {
  value?: string
  onChange: (value: string | undefined) => void
  iconMap: Record<string, ComponentType<IconProps>>
  iconOptions: Array<{ value: string; label: string }>
  placeholder?: string
}

export function IconPicker({ 
  value, 
  onChange, 
  iconMap, 
  iconOptions,
  placeholder = 'Select icon'
}: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const selectedIcon = value ? iconMap[value] : null
  const selectedLabel = value ? iconOptions.find(opt => opt.value === value)?.label : null

  // Filter icons based on search query
  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) return iconOptions
    
    const query = searchQuery.toLowerCase()
    return iconOptions.filter(option => 
      option.label.toLowerCase().includes(query) ||
      option.value.toLowerCase().includes(query)
    )
  }, [searchQuery, iconOptions])

  const handleSelect = (iconValue: string) => {
    if (iconValue === 'none') {
      onChange(undefined)
    } else {
      onChange(iconValue)
    }
    setOpen(false)
    setSearchQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(undefined)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full justify-start text-left font-normal",
          !value && "text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedIcon ? (
            <>
              {(() => {
                const IconComponent = selectedIcon
                return <IconComponent className="size-4 shrink-0" weight="light" />
              })()}
              <span className="truncate">{selectedLabel}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        {value && (
          <X 
            className="size-4 shrink-0 ml-2 opacity-50 hover:opacity-100" 
            onClick={handleClear}
          />
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Icon</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search icons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            {/* Icons Grid */}
            <div className="max-h-[400px] overflow-y-auto">
              {filteredIcons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No icons found
                </div>
              ) : (
                <>
                  {/* None option */}
                  <button
                    type="button"
                    onClick={() => handleSelect('none')}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      !value && "bg-accent text-accent-foreground"
                    )}
                  >
                    <div className="size-8 flex items-center justify-center rounded border border-dashed border-muted-foreground/30">
                      <X className="size-4 text-muted-foreground" />
                    </div>
                    <span>None</span>
                  </button>

                  {/* Icons grid */}
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {filteredIcons.map((option) => {
                      const IconComponent = iconMap[option.value]
                      if (!IconComponent) return null

                      const isSelected = value === option.value

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleSelect(option.value)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-2 p-3 rounded-md transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            isSelected && "bg-accent text-accent-foreground ring-2 ring-ring"
                          )}
                          title={option.label}
                        >
                          <IconComponent className="size-6" weight="light" />
                          <span className="text-xs truncate w-full text-center">
                            {option.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
