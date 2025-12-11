/**
 * Realtor.com-specific JSON cleaner
 * Removes unnecessary fields from Realtor.com Apify JSON responses
 */

import { removeEmptyValues } from './utils'

/**
 * Clean Realtor.com Apify JSON by removing unnecessary fields
 * Step 1: Remove empty values (universal for all Apify scrapers)
 * Step 2: Remove technical fields specific to Realtor.com
 * 
 * @param apifyJson - The raw Apify JSON response from Realtor.com scraper
 * @returns Cleaned JSON with empty values and unnecessary fields removed
 */
export function cleanRealtorJson(apifyJson: any): any {
  if (!apifyJson) {
    return apifyJson
  }

  // STEP 1: Remove empty values first (universal cleaning)
  let cleaned = removeEmptyValues(apifyJson)
  
  if (!cleaned) {
    return cleaned
  }

  // STEP 2: Remove technical fields
  // Handle the case where JSON has apifyData wrapper (like sample file format)
  if (cleaned.apifyData && Array.isArray(cleaned.apifyData)) {
    return {
      ...cleaned,
      apifyData: cleaned.apifyData.map((item: any) => cleanRealtorItem(item))
    }
  }

  // If it's an array (direct Apify response), clean each item
  if (Array.isArray(cleaned)) {
    return cleaned.map(item => cleanRealtorItem(item))
  }

  // If it's a single object, clean it
  if (typeof cleaned === 'object') {
    return cleanRealtorItem(cleaned)
  }

  return cleaned
}

/**
 * Clean a single Realtor.com Apify item by removing technical fields
 * Note: Empty values are already removed by removeEmptyValues() before this step
 */
function cleanRealtorItem(item: any): any {
  if (!item || typeof item !== 'object') {
    return item
  }

  // Handle arrays
  if (Array.isArray(item)) {
    return item.map(v => typeof v === 'object' && v !== null ? cleanRealtorItem(v) : v)
  }

  const cleaned: any = {}

  // Remove only specific technical fields that are not needed
  const fieldsToRemove = [
    'url', // Original URL is not needed in cleaned data
    'loadedUrl', // Loaded URL is not needed
    'requestId', // Internal request ID
    'requestQueueId', // Internal queue ID
    'taxHistory', // Tax history is not needed
    'tags', // Tags are not needed
  ]

  // Iterate through all fields and remove only technical fields
  for (const key in item) {
    // Skip only the specific technical fields
    if (fieldsToRemove.includes(key)) {
      continue
    }

    const value = item[key]

    // Recursively clean nested structures
    if (Array.isArray(value)) {
      cleaned[key] = cleanRealtorItem(value)
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = cleanRealtorItem(value)
    } else {
      // Keep all primitive values
      cleaned[key] = value
    }
  }

  return cleaned
}
