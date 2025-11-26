'use client'

import * as React from 'react'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'

interface EditableFieldProps {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  className?: string
  label?: string
}

export function EditableField({
  value,
  onChange,
  children,
  className,
  label = 'Edit text',
}: EditableFieldProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [editValue, setEditValue] = React.useState(value)

  React.useEffect(() => {
    if (isOpen) {
      setEditValue(value)
    }
  }, [isOpen, value])

  const handleSave = () => {
    onChange(editValue)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsOpen(false)
  }

  return (
    <div className={cn('group relative inline-block', className)}>
      {children}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="absolute -left-2 -top-2 size-7 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-50"
          >
            <Pencil className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">{label}</h4>
            </div>
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="min-h-[100px] resize-none"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={handleCancel}>
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

