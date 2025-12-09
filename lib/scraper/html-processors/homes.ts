/**
 * Homes.com-specific HTML processor
 * Removes unwanted sections from Homes.com HTML
 */

/**
 * Remove Homes.com specific unwanted sections from HTML main element
 * This is website-specific cleaning logic that removes sections not relevant for property details
 * 
 * @param mainElement - Cheerio main element to clean
 */
export function removeHomesSpecificSections(mainElement: any): void {
  // List of class names to remove
  const classesToRemove = [
    'schools-container',
    'parks-in-area-section',
    'transportation-container',
    'area-factors-container',
    'environment-factor-container',
    'estimated-value',
    'home-valuation-report-cta-container',
    'home-values-container',
    'average-home-value-container',
    'ldp-property-history-container',
    'suggested-listings-container',
    'breadcrumbs-container',
  ]
  
  // Build combined selector for all elements to remove
  const classSelector = classesToRemove.map(className => `.${className}`).join(', ')
  
  // Remove all matching elements
  mainElement.find(classSelector).remove()
  
  console.log(`🔵 [removeHomesSpecificSections] Removed ${classesToRemove.length} unwanted sections from Homes.com HTML`)
}
