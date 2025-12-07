/**
 * Apify JSON Cleaner
 * Removes unnecessary fields from Apify JSON responses to reduce size and noise
 */

/**
 * Clean Apify JSON by removing unnecessary fields
 * 
 * @param apifyJson - The raw Apify JSON response (usually an array or object with apifyData)
 * @returns Cleaned JSON with unnecessary fields removed
 */
export function cleanApifyJson(apifyJson: any): any {
  if (!apifyJson) {
    return apifyJson
  }

  // Handle the case where JSON has apifyData wrapper (like sample file format)
  if (apifyJson.apifyData && Array.isArray(apifyJson.apifyData)) {
    return {
      ...apifyJson,
      apifyData: apifyJson.apifyData.map((item: any) => cleanApifyItem(item))
    }
  }

  // If it's an array (direct Apify response), clean each item
  if (Array.isArray(apifyJson)) {
    return apifyJson.map(item => cleanApifyItem(item))
  }

  // If it's a single object, clean it
  if (typeof apifyJson === 'object') {
    return cleanApifyItem(apifyJson)
  }

  return apifyJson
}

/**
 * Clean a single Apify item by removing unnecessary fields
 */
function cleanApifyItem(item: any): any {
  if (!item || typeof item !== 'object') {
    return item
  }

  const cleaned: any = { ...item }

  // Remove collections field (if it exists)
  if ('collections' in cleaned) {
    delete cleaned.collections
  }

  // Remove other unnecessary fields that are typically not needed
  // Add more fields here as needed
  const fieldsToRemove = [
    'collections',
    'staticMap',
    'submitflow',
    // Add other fields to remove here
  ]

  fieldsToRemove.forEach(field => {
    if (field in cleaned) {
      delete cleaned[field]
    }
  })

  // Recursively clean nested objects
  for (const key in cleaned) {
    if (cleaned[key] && typeof cleaned[key] === 'object') {
      if (Array.isArray(cleaned[key])) {
        cleaned[key] = cleaned[key].map((nestedItem: any) => {
          if (typeof nestedItem === 'object' && nestedItem !== null) {
            return cleanApifyItem(nestedItem)
          }
          return nestedItem
        })
      } else {
        cleaned[key] = cleanApifyItem(cleaned[key])
      }
    }
  }

  return cleaned
}
