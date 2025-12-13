/**
 * Security utilities for image storage
 * Validates paths, file types, and prevents security vulnerabilities
 */

import { createHash } from 'crypto'

/**
 * Validate and sanitize storage path
 * Prevents path traversal attacks
 */
export function sanitizePath(path: string): string | null {
  if (!path || typeof path !== 'string') {
    return null
  }

  // Remove any path traversal attempts
  const normalized = path
    .replace(/\.\./g, '') // Remove ..
    .replace(/\/+/g, '/') // Normalize slashes
    .replace(/^\/+/, '') // Remove leading slashes
    .replace(/\/+$/, '') // Remove trailing slashes

  // Check for remaining dangerous patterns
  if (normalized.includes('..') || normalized.startsWith('/') || normalized.includes('//')) {
    return null
  }

  // Validate path structure (should be: prefix/id/filename or prefix/id)
  const parts = normalized.split('/')
  if (parts.length < 2 || parts.length > 3) {
    return null
  }

  // Validate prefix (temp-preview or UUID)
  const prefix = parts[0]
  if (prefix !== 'temp-preview' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prefix)) {
    return null
  }

  // Validate ID (should be UUID)
  const id = parts[1]
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return null
  }

  // Validate filename if present
  if (parts.length === 3) {
    const filename = parts[2]
    // Filename should only contain alphanumeric, dots, dashes, underscores
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return null
    }
    // Filename should have valid extension
    if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
      return null
    }
  }

  return normalized
}

/**
 * Validate file extension
 */
export function isValidImageExtension(ext: string): boolean {
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  return validExtensions.includes(ext.toLowerCase())
}

/**
 * Validate MIME type
 */
export function isValidImageMimeType(mimeType: string): boolean {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ]
  return validTypes.includes(mimeType.toLowerCase())
}

/**
 * Check image magic bytes to verify file type
 * Prevents MIME type spoofing
 */
export function validateImageMagicBytes(buffer: Buffer): { valid: boolean; detectedType?: string } {
  // Check magic bytes for common image formats
  if (buffer.length < 4) {
    return { valid: false }
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { valid: true, detectedType: 'image/jpeg' }
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { valid: true, detectedType: 'image/png' }
  }

  // GIF: 47 49 46 38 (GIF8)
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return { valid: true, detectedType: 'image/gif' }
  }

  // WebP: RIFF...WEBP
  if (buffer.length >= 12) {
    const riff = buffer.toString('ascii', 0, 4)
    const webp = buffer.toString('ascii', 8, 12)
    if (riff === 'RIFF' && webp === 'WEBP') {
      return { valid: true, detectedType: 'image/webp' }
    }
  }

  return { valid: false }
}

/**
 * Sanitize filename
 * Removes dangerous characters and ensures valid extension
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  let sanitized = filename
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscore
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots

  // Ensure it has a valid extension
  const ext = sanitized.split('.').pop()?.toLowerCase()
  if (!ext || !isValidImageExtension(ext)) {
    sanitized = `${sanitized}.jpg`
  }

  // Limit filename length
  if (sanitized.length > 255) {
    const nameWithoutExt = sanitized.substring(0, 250 - ext!.length - 1)
    sanitized = `${nameWithoutExt}.${ext}`
  }

  return sanitized
}

/**
 * Generate secure random filename
 */
export function generateSecureFilename(extension: string = 'jpg'): string {
  const timestamp = Date.now()
  const random = createHash('sha256')
    .update(`${timestamp}-${Math.random()}`)
    .digest('hex')
    .substring(0, 16)
  
  const ext = isValidImageExtension(extension) ? extension : 'jpg'
  return `${timestamp}-${random}.${ext}`
}

/**
 * Validate URL is safe to fetch
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false
    }

    // Block localhost and private IPs (security risk)
    const hostname = urlObj.hostname.toLowerCase()
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname === '0.0.0.0'
    ) {
      return false
    }

    return true
  } catch {
    return false
  }
}
