'use client'

import * as React from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Image as ImageIcon, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import type { ImageUploadResponse, ImageUploadResult } from '@/types/image'

interface ImageUploadProps {
  /** Site ID - required for upload authorization */
  siteId: string
  value?: ImageUploadResult[]
  onChange?: (images: ImageUploadResult[]) => void
  className?: string
  maxFiles?: number
  maxSize?: number // in bytes
  accept?: Record<string, string[]>
}

export function ImageUpload({
  siteId,
  value = [],
  onChange,
  className,
  maxFiles = 10,
  maxSize = 30 * 1024 * 1024, // 30MB per file (will be optimized to ~5MB by Sharp.js)
  accept = { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
}: ImageUploadProps) {
  const [images, setImages] = React.useState<ImageUploadResult[]>(value)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)

  React.useEffect(() => {
    setImages(value)
  }, [value])

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      // Validate siteId
      if (!siteId) {
        toast.error('Site ID is required for upload')
        return
      }

      // Check file count
      if (images.length + acceptedFiles.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} images allowed`)
        return
      }

      // Validate file sizes
      const oversizedFiles = acceptedFiles.filter(file => file.size > maxSize)
      if (oversizedFiles.length > 0) {
        const fileNames = oversizedFiles.map(f => f.name).join(', ')
        toast.error(
          `File${oversizedFiles.length > 1 ? 's' : ''} too large: ${fileNames}. ` +
          `Maximum size is ${maxSize / 1024 / 1024}MB per file (will be optimized to ~5MB).`
        )
        return
      }

      setIsUploading(true)
      setUploadProgress(0)

      try {
        // Create FormData with siteId
        const formData = new FormData()
        formData.append('siteId', siteId)
        acceptedFiles.forEach((file) => {
          formData.append('images', file)
        })

        // Upload via API
        const xhr = new XMLHttpRequest()

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentage = Math.round((e.loaded / e.total) * 100)
            setUploadProgress(percentage)
          }
        })

        // Handle response
        const uploadPromise = new Promise<ImageUploadResponse>((resolve, reject) => {
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText))
            } else {
              try {
                const errorResponse = JSON.parse(xhr.responseText)
                reject(new Error(errorResponse.error || `Upload failed: ${xhr.statusText}`))
              } catch {
                reject(new Error(`Upload failed: ${xhr.statusText}`))
              }
            }
          })
          xhr.addEventListener('error', () => {
            reject(new Error('Upload failed'))
          })
        })

        xhr.open('POST', '/api/upload')
        xhr.send(formData)

        const response = await uploadPromise

        if (response.success && response.images) {
          const updatedImages = [...images, ...response.images]
          setImages(updatedImages)
          onChange?.(updatedImages)
          
          toast.success(
            `Successfully uploaded ${response.images.length} image${
              response.images.length > 1 ? 's' : ''
            }`
          )

          // Show warning if some files failed
          if (response.error) {
            toast.warning(response.error)
          }
        } else {
          toast.error(response.error || 'Upload failed')
        }
      } catch (error) {
        console.error('Upload error:', error)
        toast.error(
          error instanceof Error ? error.message : 'Failed to upload images'
        )
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    [images, maxFiles, onChange, siteId]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    multiple: true,
    disabled: isUploading || images.length >= maxFiles || !siteId,
  })

  // Show error for rejected files (e.g., too large, wrong type)
  React.useEffect(() => {
    if (fileRejections.length > 0) {
      fileRejections.forEach((rejection) => {
        if (rejection.errors.some(e => e.code === 'file-too-large')) {
          toast.error(
            `File too large: ${rejection.file.name}. Maximum size is ${maxSize / 1024 / 1024}MB per file ` +
            `(will be optimized to ~5MB by Sharp.js).`
          )
        } else if (rejection.errors.some(e => e.code === 'file-invalid-type')) {
          toast.error(`Invalid file type: ${rejection.file.name}. Please upload JPEG, PNG, GIF, or WebP.`)
        } else if (rejection.errors.some(e => e.code === 'too-many-files')) {
          toast.error(`Too many files. Maximum ${maxFiles} images allowed.`)
        }
      })
    }
  }, [fileRejections, maxSize, maxFiles])

  const handleRemove = async (index: number) => {
    const imageToRemove = images[index]
    if (!imageToRemove) return

    // Delete from Storage if it's a valid Storage URL
    if (imageToRemove.url && imageToRemove.url.includes('/storage/v1/object/public/site-images/')) {
      try {
        // Extract path from URL
        const urlParts = imageToRemove.url.split('/site-images/')
        if (urlParts.length === 2) {
          const filePathFromUrl = urlParts[1]
          
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          
          const { data, error } = await supabase.storage
            .from('site-images')
            .remove([filePathFromUrl])

          if (error) {
            console.error('[ImageUpload] Delete error:', error)
            toast.error(`Failed to delete: ${error.message}`)
            return
          }

          // Supabase Storage remove() returns empty array [] if RLS blocks or file doesn't exist
          if (!data || data.length === 0) {
            console.warn('[ImageUpload] No files deleted:', {
              filePathFromUrl,
              siteId,
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

          toast.success('Image deleted')
        }
      } catch (error) {
        console.error('Error deleting image:', error)
        toast.error('Failed to delete image')
        return
      }
    }

    // Update state and trigger onChange to auto-save config
    const updatedImages = images.filter((_, i) => i !== index)
    setImages(updatedImages)
    onChange?.(updatedImages)
  }

  // Show error state if no siteId
  if (!siteId) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-background p-8 text-center opacity-50">
          <div className="rounded-full bg-muted p-4">
            <ImageIcon className="size-8 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Site ID required for image upload
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-background p-8 transition-colors',
          isDragActive && 'border-orange-500 bg-orange-50 dark:bg-orange-950',
          'hover:border-border hover:bg-accent',
          (isUploading || images.length >= maxFiles) &&
            'cursor-not-allowed opacity-50'
        )}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="flex w-full flex-col items-center gap-3 text-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <div className="w-full max-w-xs space-y-2">
              <p className="text-sm text-muted-foreground">
                Processing images... {uploadProgress}%
              </p>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-muted p-4">
              {isDragActive ? (
                <Upload className="size-8 text-orange-500" />
              ) : (
                <ImageIcon className="size-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-base font-medium">
                {isDragActive
                  ? 'Drop images here'
                  : 'Drop images here or click to upload'}
              </p>
              <p className="text-sm text-muted-foreground">
                Up to {maxFiles} images • Max {maxSize / 1024 / 1024}MB per file
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((image, index) => (
            <div
              key={image.path}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <img
                src={image.url}
                alt={`Upload ${index + 1}`}
                className="size-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="size-8"
                  onClick={() => handleRemove(index)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                {image.width} × {image.height}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload status */}
      {images.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
          <Check className="size-4 text-green-500" />
          <span className="text-muted-foreground">
            {images.length} image{images.length > 1 ? 's' : ''} uploaded •{' '}
            {(
              images.reduce((sum, img) => sum + img.size, 0) /
              1024 /
              1024
            ).toFixed(2)}
            MB total
          </span>
        </div>
      )}
    </div>
  )
}
