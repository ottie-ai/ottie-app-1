'use client'

import * as React from 'react'
import { useDropzone, type DropzoneOptions } from 'react-dropzone'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { ImageUploadResponse } from '@/types/image'

interface FileUploadProps extends Omit<DropzoneOptions, 'onDrop'> {
  value?: string | null
  onChange?: (value: string | null) => void
  onImageSaved?: () => void // Called after successful upload or delete - use for auto-saving config
  className?: string
  placeholder?: string
  siteId: string // REQUIRED: Site ID for uploading to Supabase Storage with Sharp.js optimization
}

/**
 * FileUpload component with Sharp.js optimization
 * - Uploads via /api/upload endpoint
 * - Automatic image optimization (resize, WebP, EXIF removal)
 * - Single file upload for form fields
 */
export function FileUpload({
  value,
  onChange,
  onImageSaved,
  className,
  placeholder = 'Drop an image here or click to upload',
  accept = { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
  maxSize = 30 * 1024 * 1024, // 30MB (will be optimized to ~5MB by Sharp.js)
  siteId,
  ...props
}: FileUploadProps) {
  const [preview, setPreview] = React.useState<string | null>(value ?? null)
  const [isUploading, setIsUploading] = React.useState(false)

  React.useEffect(() => {
    setPreview(value ?? null)
  }, [value])

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      if (!siteId) {
        toast.error('Site ID is required for image upload')
        return
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.')
        return
      }

      // Validate file size (max 30MB - will be optimized to ~5MB by Sharp.js)
      if (file.size > maxSize) {
        toast.error(`File size too large. Maximum size is ${maxSize / 1024 / 1024}MB (will be optimized to ~5MB).`)
        return
      }

      setIsUploading(true)
      try {
        // Show temporary preview while uploading
        const reader = new FileReader()
        reader.onload = () => {
          setPreview(reader.result as string)
        }
        reader.readAsDataURL(file)

        // Create FormData with siteId and image
        const formData = new FormData()
        formData.append('siteId', siteId)
        formData.append('images', file)

        // Upload via Sharp.js API endpoint
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const result: ImageUploadResponse = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Upload failed')
        }

        if (!result.images || result.images.length === 0) {
          throw new Error('No image returned from upload')
        }

        // Get the uploaded image URL
        const uploadedImage = result.images[0]
        setPreview(uploadedImage.url)
        onChange?.(uploadedImage.url)
        
        // Trigger auto-save after successful upload
        if (onImageSaved) {
          setTimeout(() => onImageSaved(), 100)
        }
        
        toast.success('Image uploaded and optimized')
      } catch (error) {
        console.error('Error uploading image:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to upload image. Please try again.')
        setPreview(value ?? null) // Revert to original value
      } finally {
        setIsUploading(false)
      }
    },
    [onChange, siteId, maxSize, value]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled: isUploading,
    ...props,
  })

  // Show error for rejected files (e.g., too large)
  React.useEffect(() => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0]
      if (rejection.errors.some(e => e.code === 'file-too-large')) {
        toast.error(
          `File too large: ${rejection.file.name}. Maximum size is ${maxSize / 1024 / 1024}MB ` +
          `(will be optimized to ~5MB by Sharp.js).`
        )
      } else if (rejection.errors.some(e => e.code === 'file-invalid-type')) {
        toast.error(`Invalid file type: ${rejection.file.name}. Please upload JPEG, PNG, GIF, or WebP.`)
      }
    }
  }, [fileRejections, maxSize])

  const handleRemove = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    e.nativeEvent.stopImmediatePropagation()
    
    // Delete from Storage if it's a valid Storage URL
    if (value && typeof value === 'string' && value.includes('/storage/v1/object/public/site-images/')) {
      try {
        // Extract path from URL (includes any Supabase suffixes like -1, -2, etc.)
        // URL format: https://[project].supabase.co/storage/v1/object/public/site-images/[path]
        const urlParts = value.split('/site-images/')
        if (urlParts.length === 2) {
          const filePathFromUrl = urlParts[1]
          
          // Delete directly from Storage using path from URL
          // Path from URL is the source of truth (includes any Supabase suffixes)
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          
          console.log('[FileUpload] Deleting from storage:', { filePathFromUrl, siteId })
          
          const { data, error } = await supabase.storage
            .from('site-images')
            .remove([filePathFromUrl])

          console.log('[FileUpload] Delete response:', { 
            data, 
            error, 
            filePathFromUrl,
            dataLength: data?.length,
            dataContent: data,
            errorMessage: error?.message
          })

          if (error) {
            console.error('[FileUpload] Delete error:', error)
            toast.error(`Failed to delete: ${error.message}`)
            return
          }

          // Supabase Storage remove() returns empty array [] if RLS blocks or file doesn't exist
          // Returns array with deleted file paths if successful
          if (!data || data.length === 0) {
            console.warn('[FileUpload] No files deleted:', {
              filePathFromUrl,
              siteId,
              response: data,
              possibleReasons: [
                'RLS policy blocked delete',
                'File already deleted',
                'File path incorrect',
                'User lacks permissions'
              ]
            })
            toast.error('Failed to delete: Access denied or file not found')
            return
          }

          console.log('[FileUpload] Image deleted successfully:', { 
            deleted: data,
            filePath: filePathFromUrl
          })
          
          toast.success('Image deleted')
        }
      } catch (error) {
        console.error('Error deleting image:', error)
        toast.error('Failed to delete image')
        return
      }
    }
    
    // Clear preview and trigger onChange (auto-save via section-morphing-indicator)
    setPreview(null)
    onChange?.(null)
    
    // Trigger auto-save after successful delete
    if (onImageSaved) {
      setTimeout(() => onImageSaved(), 100)
    }
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-background p-4 transition-colors',
        isDragActive && 'border-orange-500 bg-orange-50 dark:bg-orange-950',
        'hover:border-border hover:bg-accent',
        className
      )}
    >
      <input {...getInputProps()} />
      
      {isUploading ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Optimizing image...</p>
        </div>
      ) : preview ? (
        <div className="relative w-full">
          <img
            src={preview}
            alt="Preview"
            className="mx-auto max-h-32 rounded-md object-contain"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 size-6"
            onClick={handleRemove}
            disabled={isUploading}
          >
            <X className="size-3" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="rounded-full bg-muted p-3">
            {isDragActive ? (
              <Upload className="size-5 text-orange-500" />
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
