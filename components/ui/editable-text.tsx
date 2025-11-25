'use client'

import React from 'react'
import { PencilSimple } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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

  const handleSave = () => {
    onChange(editValue)
  }

  const handleCancel = () => {
    setEditValue(value)
  }

  return (
    <div className={cn('group/editable relative inline-block', className)}>
      {children}

      {/* Edit Button with Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="absolute -top-2 -right-2 size-7 opacity-0 group-hover/editable:opacity-100 transition-opacity shadow-lg z-10"
          >
            <PencilSimple className="size-3.5" weight="bold" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium leading-none">{label}</h4>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>

            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="min-h-[120px] resize-none"
              autoFocus
            />

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

