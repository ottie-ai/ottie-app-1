/**
 * Realtor.com-specific JSON cleaner
 * Removes unnecessary fields from Realtor.com Apify JSON responses
 */

/**
 * Clean Realtor.com Apify JSON by removing unnecessary fields
 * 
 * @param apifyJson - The raw Apify JSON response from Realtor.com scraper
 * @returns Cleaned JSON with unnecessary fields removed
 */
export function cleanRealtorJson(apifyJson: any): any {
  if (!apifyJson) {
    return apifyJson
  }

  // Handle the case where JSON has apifyData wrapper (like sample file format)
  if (apifyJson.apifyData && Array.isArray(apifyJson.apifyData)) {
    return {
      ...apifyJson,
      apifyData: apifyJson.apifyData.map((item: any) => cleanRealtorItem(item))
    }
  }

  // If it's an array (direct Apify response), clean each item
  if (Array.isArray(apifyJson)) {
    return apifyJson.map(item => cleanRealtorItem(item))
  }

  // If it's a single object, clean it
  if (typeof apifyJson === 'object') {
    return cleanRealtorItem(apifyJson)
  }

  return apifyJson
}

/**
 * Clean a single Realtor.com Apify item by removing only empty values
 * Preserves all data structure - only removes null, undefined, empty strings, empty arrays, empty objects
 * Very conservative approach - keeps everything that has any content
 */
function cleanRealtorItem(item: any): any {
  if (!item || typeof item !== 'object') {
    return item
  }

  // Handle arrays - clean each item but keep all non-empty items
  if (Array.isArray(item)) {
    const cleaned = item
      .map(v => typeof v === 'object' && v !== null ? cleanRealtorItem(v) : v)
      .filter(v => {
        // Remove only truly empty values
        if (v === null || v === undefined || v === '') return false
        if (Array.isArray(v) && v.length === 0) return false
        if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return false
        return true
      })
    return cleaned
  }

  // Start with a copy of the object to preserve all fields
  const cleaned: any = {}

  // Remove only specific technical fields that are not needed
  const fieldsToRemove = [
    'url', // Original URL is not needed in cleaned data
    'loadedUrl', // Loaded URL is not needed
    'requestId', // Internal request ID
    'requestQueueId', // Internal queue ID
  ]

  // Iterate through all fields and preserve everything except empty values
  for (const key in item) {
    // Skip only the specific technical fields
    if (fieldsToRemove.includes(key)) {
      continue
    }

    const value = item[key]

    // Skip only truly empty primitive values (null, undefined, empty string)
    if (value === null || value === undefined || value === '') {
      continue
    }

    // For arrays - clean recursively but always keep if original had items
    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue // Skip empty arrays
      }
      // Recursively clean array items
      const cleanedArray = cleanRealtorItem(value)
      // Always keep if original had items (preserve structure)
      cleaned[key] = cleanedArray
    } 
    // For objects - clean recursively but always preserve if original had keys
    else if (typeof value === 'object' && value !== null) {
      // Skip only if object is completely empty (no keys at all)
      const originalKeys = Object.keys(value)
      if (originalKeys.length === 0) {
        continue
      }
      // Recursively clean nested objects
      const cleanedObject = cleanRealtorItem(value)
      // Always keep if original had keys (preserve structure even if nested values were cleaned)
      cleaned[key] = cleanedObject
    } 
    // For primitives - always keep (string, number, boolean, etc.)
    else {
      cleaned[key] = value
    }
  }

  return cleaned
}
