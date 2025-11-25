'use client'

import { ReactNode } from 'react'
import { Sparkle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface SectionEditorProps {
  children: ReactNode
  settingsPanel: ReactNode
  onSave?: () => void
  className?: string
}

/**
 * SectionEditor - Wraps a section with an expandable "Remix" button
 * that reveals settings when clicked
 */
export function SectionEditor({ 
  children, 
  settingsPanel, 
  onSave,
  className = '' 
}: SectionEditorProps) {
  return (
    <div className={`relative group ${className}`}>
      {/* Section Content */}
      {children}

      {/* Remix Button / Settings Panel */}
      <div className="absolute top-4 right-4 z-40">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              className="gap-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              <Sparkle weight="fill" className="w-4 h-4" />
              Remix
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            align="end" 
            sideOffset={8}
            className="w-80"
          >
            <div className="grid gap-4">
              {/* Header */}
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Edit Section</h4>
                <p className="text-sm text-muted-foreground">
                  Customize the appearance of this section.
                </p>
              </div>

              {/* Settings Content */}
              <div className="max-h-[50vh] overflow-y-auto">
                {settingsPanel}
              </div>

              {/* Save Button */}
              <Button
                size="sm"
                className="w-full"
                onClick={onSave}
              >
                Save
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
