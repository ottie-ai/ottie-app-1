/**
 * Utility functions for Apify JSON cleaners
 * Shared functions used across different website-specific cleaners
 */

/**
 * Remove empty values from an object recursively
 * Removes: null, undefined, empty strings, empty arrays, empty objects
 * 
 * @param obj - Object to clean
 * @returns Cleaned object with empty values removed
 */
export function removeEmptyValues(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    const cleaned = obj
      .map(item => typeof item === 'object' && item !== null ? removeEmptyValues(item) : item)
      .filter(item => {
        if (item === null || item === undefined || item === '') return false
        if (Array.isArray(item) && item.length === 0) return false
        if (typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length === 0) return false
        return true
      })
    return cleaned.length > 0 ? cleaned : undefined
  }

  const cleaned: any = {}
  for (const key in obj) {
    const value = obj[key]
    
    // Skip null, undefined, and empty strings
    if (value === null || value === undefined || value === '') {
      continue
    }
    
    // Skip empty arrays
    if (Array.isArray(value) && value.length === 0) {
      continue
    }
    
    // Skip empty objects
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
      continue
    }
    
    // Recursively clean nested objects and arrays
    if (Array.isArray(value)) {
      const cleanedArray = removeEmptyValues(value)
      if (cleanedArray && cleanedArray.length > 0) {
        cleaned[key] = cleanedArray
      }
    } else if (typeof value === 'object' && value !== null) {
      const cleanedObject = removeEmptyValues(value)
      if (cleanedObject && Object.keys(cleanedObject).length > 0) {
        cleaned[key] = cleanedObject
      }
    } else {
      // Keep primitive values (string, number, boolean, etc.)
      cleaned[key] = value
    }
  }

  return cleaned
}
