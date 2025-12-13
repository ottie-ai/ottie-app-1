'use server'

import { createClient } from '@/lib/supabase/server'
import { downloadAndUploadImage } from '@/lib/storage/image-processor'

const BUCKET_NAME = 'site-images'

/**
 * Upload an image file to Supabase Storage for a site
 * @param siteId - Site ID
 * @param file - File to upload
 * @returns Public URL of uploaded image or error
 */
export async function uploadSiteImage(
  siteId: string,
  file: File
): Promise<{ success: true; url: string } | { error: string }> {
  try {
    const supabase = await createClient()
    
    // Verify user has access to this site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('workspace_id')
      .eq('id', siteId)
      .is('deleted_at', null)
      .single()

    if (siteError || !site) {
      return { error: 'Site not found or access denied' }
    }

    // Verify user is member of workspace
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Not authenticated' }
    }

    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('workspace_id', site.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return { error: 'Access denied' }
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return { error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.' }
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return { error: 'File size too large. Maximum size is 10MB.' }
    }

    // Validate siteId is UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(siteId)) {
      return { error: 'Invalid site ID' }
    }

    // Sanitize filename and generate secure one
    const { sanitizeFilename, generateSecureFilename, isValidImageExtension } = await import('@/lib/storage/security')
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const validExt = isValidImageExtension(fileExt) ? fileExt : 'jpg'
    const fileName = generateSecureFilename(validExt)
    const targetPath = `${siteId}/${fileName}`
    
    // Validate path
    const { sanitizePath } = await import('@/lib/storage/security')
    const sanitizedPath = sanitizePath(targetPath)
    if (!sanitizedPath) {
      return { error: 'Invalid file path' }
    }

    // Convert File to Buffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate file content with magic bytes
    const { validateImageMagicBytes } = await import('@/lib/storage/security')
    const magicBytesCheck = validateImageMagicBytes(buffer)
    if (!magicBytesCheck.valid) {
      return { error: 'Invalid image file' }
    }

    // Use detected type from magic bytes
    const detectedType = magicBytesCheck.detectedType || file.type

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(sanitizedPath, buffer, {
        contentType: detectedType,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      return { error: 'Failed to upload image. Please try again.' }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(sanitizedPath)

    if (!urlData?.publicUrl) {
      return { error: 'Failed to get image URL' }
    }

    return { success: true, url: urlData.publicUrl }
  } catch (error) {
    console.error('Error in uploadSiteImage:', error)
    return { 
      error: error instanceof Error ? error.message : 'Unknown error uploading image' 
    }
  }
}

/**
 * Upload an image from URL (for temp previews)
 * Downloads the image and uploads to Supabase Storage
 * @param previewId - Temp preview ID
 * @param imageUrl - URL of image to download
 * @returns Public URL of uploaded image or error
 */
export async function uploadImageFromUrl(
  previewId: string,
  imageUrl: string
): Promise<{ success: true; url: string } | { error: string }> {
  try {
    // Validate previewId is UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(previewId)) {
      return { error: 'Invalid preview ID' }
    }

    // Validate URL
    const { isValidImageUrl } = await import('@/lib/storage/security')
    if (!isValidImageUrl(imageUrl)) {
      return { error: 'Invalid image URL' }
    }

    const basePath = `temp-preview/${previewId}`
    const result = await downloadAndUploadImage(imageUrl, basePath)
    
    if (result.success) {
      return { success: true, url: result.url }
    } else {
      return { error: result.error }
    }
  } catch (error) {
    console.error('Error in uploadImageFromUrl:', error)
    return { 
      error: error instanceof Error ? error.message : 'Unknown error uploading image' 
    }
  }
}
