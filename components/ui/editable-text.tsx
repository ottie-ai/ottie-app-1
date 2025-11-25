'use client'

import * as React from 'react'
import { PencilSimple } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
    <>
      <div className={cn('group/editable relative inline-block', className)}>
        {children}
        
        {/* Edit Button - appears on hover */}
        <Button
          size="icon"
          variant="secondary"
          className="absolute -top-2 -right-2 size-7 opacity-0 group-hover/editable:opacity-100 transition-opacity shadow-lg z-10"
          onClick={() => setIsOpen(true)}
        >
          <PencilSimple className="size-3.5" weight="bold" />
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="min-h-[120px] resize-none"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

