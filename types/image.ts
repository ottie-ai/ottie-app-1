/**
 * Image Upload Types
 */

export interface ImageUploadResult {
  url: string
  path: string
  width: number
  height: number
  size: number
  format: string
}

export interface ImageUploadResponse {
  success: boolean
  images?: ImageUploadResult[]
  error?: string
}

export interface PropertyPhoto {
  id: string
  url: string
  width: number
  height: number
  size: number
  caption?: string
  order: number
}

export interface PropertyPhotosSchema {
  photos: PropertyPhoto[]
  coverPhoto?: PropertyPhoto
  totalSize: number
  count: number
}

export interface ImageUploadProgress {
  loaded: number
  total: number
  percentage: number
}
