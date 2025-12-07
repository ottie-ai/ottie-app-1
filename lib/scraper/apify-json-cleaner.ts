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

  // Remove submitFlow field (if it exists)
  if ('submitFlow' in cleaned) {
    delete cleaned.submitFlow
  }

  // Remove collections field (if it exists)
  if ('collections' in cleaned) {
    delete cleaned.collections
  }

  // Remove other unnecessary fields that are typically not needed
  // Add more fields here as needed
  const fieldsToRemove = [
    'collections',
    // Add other fields to remove here
  ]

  fieldsToRemove.forEach(field => {
    if (field in cleaned) {
      delete cleaned[field]
    }
  })

  // Process staticMap - extract latitude and longitude from Google Maps URL
  // Do this before recursive cleaning to avoid processing the complex staticMap structure
  if ('staticMap' in cleaned && cleaned.staticMap) {
    const staticMapData = cleaned.staticMap
    let latitude: number | null = null
    let longitude: number | null = null

    // Try to extract from staticMap.sources[0].url
    if (staticMapData.sources && Array.isArray(staticMapData.sources) && staticMapData.sources.length > 0) {
      const firstUrl = staticMapData.sources[0]?.url
      if (firstUrl && typeof firstUrl === 'string') {
        // Extract center parameter from URL: center=18.442053,-66.06174
        const centerMatch = firstUrl.match(/center=([^&]+)/)
        if (centerMatch) {
          const [lat, lng] = centerMatch[1].split(',')
          latitude = parseFloat(lat)
          longitude = parseFloat(lng)
        }
      }
    }

    // Replace staticMap with simplified object containing only lat/lng
    cleaned.staticMap = {
      latitude: latitude || null,
      longitude: longitude || null,
    }
  }

  // Recursively clean nested objects (but skip staticMap since we already processed it)
  for (const key in cleaned) {
    if (key === 'staticMap') {
      // Skip staticMap - we already processed it and it's now a simple object
      continue
    }
    
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
