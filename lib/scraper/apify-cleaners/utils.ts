/**
 * Utility functions for cleaning Apify JSON
 * Universal helper for removing empty values from any Apify scraper output
 */

/**
 * Recursively remove empty values from an object
 * Removes null, undefined, empty strings, empty arrays, and empty objects
 * This is the FIRST step in any Apify cleaner - removes empty values before any other processing
 */
export function removeEmptyValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    const cleaned = obj
      .map(item => removeEmptyValues(item))
      .filter(item => {
        if (item === null || item === undefined || item === '') return false
        if (Array.isArray(item) && item.length === 0) return false
        if (typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length === 0) return false
        return true
      })
    return cleaned.length > 0 ? cleaned : undefined
  }

  // Handle objects
  if (typeof obj === 'object') {
    const cleaned: any = {}
    
    for (const key in obj) {
      const value = obj[key]
      
      // Skip null, undefined, empty strings
      if (value === null || value === undefined || value === '') {
        continue
      }
      
      // Skip empty arrays
      if (Array.isArray(value) && value.length === 0) {
        continue
      }
      
      // Skip empty objects (but check after recursion for nested objects)
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
        continue
      }
      
      // Recursively clean nested values
      if (typeof value === 'object') {
        const cleanedValue = removeEmptyValues(value)
        
        // Only add if not empty after cleaning
        if (cleanedValue !== undefined) {
          if (Array.isArray(cleanedValue) && cleanedValue.length === 0) {
            // Skip empty arrays
            continue
          } else if (!Array.isArray(cleanedValue) && typeof cleanedValue === 'object' && Object.keys(cleanedValue).length === 0) {
            // Skip empty objects
            continue
          } else {
            cleaned[key] = cleanedValue
          }
        }
      } else {
        // Keep primitive values
        cleaned[key] = value
      }
    }
    
    return Object.keys(cleaned).length > 0 ? cleaned : undefined
  }

  // Return primitive values as-is
  return obj
}
