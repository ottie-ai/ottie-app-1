'use client'

import { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface SectionEditorProps {
  children: ReactNode
  remixPanel?: ReactNode
  onSave?: () => void
  className?: string
  isFirstSection?: boolean
}

/**
 * SectionEditor - Wraps a section with "Remix Section" and "Settings" buttons
 */
export function SectionEditor({ 
  children, 
  remixPanel,
  onSave,
  className = '',
  isFirstSection = false,
}: SectionEditorProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Section Content */}
      {children}

      {/* Editor Buttons - Admin UI, should respect theme */}
      <div className={`absolute ${isFirstSection ? 'top-28' : 'top-16'} right-4 z-40 flex gap-2`}>
        {/* Remix Section Button */}
        {remixPanel && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                className="gap-2 shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                Remix Section
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              align="end" 
              sideOffset={8}
              className="w-80"
            >
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Remix Section</h4>
                  <p className="text-sm text-muted-foreground">
                    Change layout and visuals.
                  </p>
                  </div>
                <div className="max-h-[50vh] overflow-y-auto">
                  {remixPanel}
                </div>
                <Button size="sm" className="w-full" onClick={onSave}>
                      Save
                    </Button>
                  </div>
            </PopoverContent>
          </Popover>
          )}
      </div>
    </div>
  )
}
