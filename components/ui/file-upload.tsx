'use client'

import * as React from 'react'
import { useDropzone, type DropzoneOptions } from 'react-dropzone'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DestructiveButton } from '@/components/ui/destructive-button'

interface FileUploadProps extends Omit<DropzoneOptions, 'onDrop'> {
  value?: string | null
  onChange?: (value: string | null) => void
  className?: string
  placeholder?: string
}

export function FileUpload({
  value,
  onChange,
  className,
  placeholder = 'Drop an image here or click to upload',
  accept = { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
  maxSize = 5 * 1024 * 1024, // 5MB
  ...props
}: FileUploadProps) {
  const [preview, setPreview] = React.useState<string | null>(value ?? null)

  React.useEffect(() => {
    setPreview(value ?? null)
  }, [value])

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          setPreview(result)
          onChange?.(result)
        }
        reader.readAsDataURL(file)
      }
    },
    [onChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    ...props,
  })

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPreview(null)
    onChange?.(null)
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-input bg-background p-4 transition-colors',
        isDragActive && 'border-primary bg-primary/5',
        'hover:border-primary/50 hover:bg-muted/50',
        className
      )}
    >
      <input {...getInputProps()} />
      
      {preview ? (
        <div className="relative w-full">
          <img
            src={preview}
            alt="Preview"
            className="mx-auto max-h-32 rounded-md object-contain"
          />
          <DestructiveButton
            type="button"
            size="icon"
            className="absolute -right-2 -top-2 size-6"
            onClick={handleRemove}
          >
            <X className="size-3" />
          </DestructiveButton>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="rounded-full bg-muted p-3">
            {isDragActive ? (
              <Upload className="size-5 text-primary" />
            ) : (
              <ImageIcon className="size-5 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">{placeholder}</p>
        </div>
      )}
    </div>
  )
}

