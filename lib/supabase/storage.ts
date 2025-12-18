/**
 * Supabase Storage Helpers
 */

/**
 * Get Supabase Storage URL
 * Returns the base URL for Supabase Storage
 */
export function getStorageUrl(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
  }

  return `${supabaseUrl}/storage/v1`
}

/**
 * Get public URL for a storage object
 * @param bucket - Bucket name
 * @param path - Path to object in bucket
 */
export function getPublicUrl(bucket: string, path: string): string {
  return `${getStorageUrl()}/object/public/${bucket}/${path}`
}

/**
 * Get bucket name for site images
 * Stores:
 * - User uploaded images: {user-id}/*
 * - Site images: {site-id}/*
 * - Temp preview images: temp-preview/{preview-id}/*
 */
export const SITE_IMAGES_BUCKET = 'site-images'
