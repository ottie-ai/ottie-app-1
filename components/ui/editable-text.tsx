'use client'

import React from 'react'
import { Pencil, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Textarea } from '@/components/ui/textarea'

interface EditableTextProps {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  className?: string
  label?: string
  description?: string
  multiline?: boolean
}

export function EditableText({
  value,
  onChange,
  children,
  className,
  label = 'Edit Text',
  description = 'Make changes to the text below.',
  multiline = true,
}: EditableTextProps) {
  const [editValue, setEditValue] = React.useState(value)
  const [isOpen, setIsOpen] = React.useState(false)

  const handleSave = () => {
    onChange(editValue)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsOpen(false)
  }

  return (
    <div className={cn('group/editable relative inline-block', className)}>
      {children}

      {/* Edit Button with Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className={cn(
              "absolute -top-2 -left-2 size-7 transition-opacity shadow-lg z-10",
              isOpen ? "opacity-100" : "opacity-0 group-hover/editable:opacity-100"
            )}
          >
            <Pencil className="size-4" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-96" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium leading-none">{label}</h4>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>

            <div className="relative">
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="min-h-[120px] resize-none pr-12"
                autoFocus
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute bottom-2 right-2 size-8"
                  >
                    <Sparkles className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enhance text</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

