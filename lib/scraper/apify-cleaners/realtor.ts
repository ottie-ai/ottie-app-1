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
 * Clean a single Realtor.com Apify item by removing unnecessary fields
 * For now, we keep most fields as the scraper structure may vary
 * This can be refined once we see actual data structure
 */
function cleanRealtorItem(item: any): any {
  if (!item || typeof item !== 'object') {
    return item
  }

  const cleaned: any = {}

  // Remove common unnecessary fields that might be present
  // This list can be expanded based on actual scraper output
  const fieldsToRemove = [
    'url', // Original URL is not needed in cleaned data
    'loadedUrl', // Loaded URL is not needed
    'requestId', // Internal request ID
    'requestQueueId', // Internal queue ID
  ]

  // Iterate through all fields and only keep non-empty values
  for (const key in item) {
    // Skip fields that should be removed
    if (fieldsToRemove.includes(key)) {
      continue
    }

    const value = item[key]

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
      const cleanedArray = value.map(v => 
        typeof v === 'object' && v !== null ? cleanRealtorItem(v) : v
      ).filter(v => {
        // Remove null, undefined, empty strings, empty objects, empty arrays
        if (v === null || v === undefined || v === '') return false
        if (Array.isArray(v) && v.length === 0) return false
        if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return false
        return true
      })
      
      // Only add array if it's not empty after cleaning
      if (cleanedArray.length > 0) {
        cleaned[key] = cleanedArray
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively clean nested objects
      const cleanedObject = cleanRealtorItem(value)
      // Only add object if it's not empty after cleaning
      if (Object.keys(cleanedObject).length > 0) {
        cleaned[key] = cleanedObject
      }
    } else {
      // Keep primitive values (string, number, boolean, etc.)
      cleaned[key] = value
    }
  }

  return cleaned
}
