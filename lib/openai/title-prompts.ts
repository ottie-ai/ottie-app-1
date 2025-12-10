/**
 * OpenAI Title Generation Prompts
 * Centralized prompts for title and highlights generation
 */

/**
 * Get the title and highlights generation prompt
 * Returns JSON with title and highlights
 * 
 * @param propertyData - The property data (JSON stringified config from first OpenAI call)
 * @param currentTitle - Optional current title to improve/regenerate
 * @param currentHighlights - Optional current highlights to improve/regenerate
 * @returns Complete prompt string for title and highlights generation
 */
export function getTitleGenerationPrompt(
  propertyData: string,
  currentTitle?: string,
  currentHighlights?: any[]
): string {
  const iconCategories = {
    location: { label: "Location & Area", icons: ["MapPin", "Compass", "GlobeHemisphereWest", "Signpost", "MapTrifold"] },
    view: { label: "Views & Scenery", icons: ["Mountains", "SunHorizon", "Tree", "Waves", "Binoculars"] },
    bedroom: { label: "Bedrooms", icons: ["Bed", "Door", "DoorOpen"] },
    bathroom: { label: "Bathrooms", icons: ["Toilet", "Bathtub", "Shower"] },
    kitchen: { label: "Kitchen", icons: ["Oven", "CookingPot", "ForkKnife"] },
    luxury: { label: "Luxury & Premium", icons: ["Crown", "Diamond", "Sparkle", "Asterisk", "Star"] },
    pool: { label: "Pool & Water", icons: ["SwimmingPool", "Waves", "Drop"] },
    parking: { label: "Parking", icons: ["CarSimple", "Garage", "Car"] },
    outdoor: { label: "Outdoor & Garden", icons: ["Tree", "Flower", "PottedPlant", "Plant", "Park"] },
    security: { label: "Security & Safety", icons: ["ShieldCheck", "Lock", "Camera", "Alarm"] },
    heating_cooling: { label: "Climate Control", icons: ["Thermometer", "Fan", "Sun", "Snowflake"] },
    energy: { label: "Energy & Utilities", icons: ["SolarPanel", "Lightning", "BatteryFull", "Windmill", "Plug"] },
    price: { label: "Price & Financial", icons: ["CurrencyDollar", "CurrencyEur", "CurrencyGbp", "Coin", "Receipt"] },
    size: { label: "Size & Measurements", icons: ["Ruler", "Square", "Resize", "ArrowsOut"] },
    elevator: { label: "Elevator & Accessibility", icons: ["Elevator", "Wheelchair", "WheelchairMotion"] },
    building: { label: "Building & Structure", icons: ["House", "Building", "Buildings", "CastleTurret", "BuildingApartment"] },
    appliances: { label: "Appliances & Furniture", icons: ["Couch", "Chair", "Table", "Lamp", "Desk"] },
    storage: { label: "Storage & Space", icons: ["Dresser", "Books", "Cube", "Folder", "Archive"] },
    distance: { label: "Proximity & Distance", icons: ["MapPin", "NavigationArrow", "Signpost", "Compass"] },
    trending: { label: "Trending & Popular", icons: ["TrendUp", "Fire", "Heart", "Star", "Lightning"] },
    miscellaneous: { label: "General", icons: ["Check", "Plus", "Info", "CheckCircle"] }
  }

  const iconJson = JSON.stringify(iconCategories, null, 2)

  // Parse propertyData to get language if available
  let language = 'en' // default
  try {
    const parsed = JSON.parse(propertyData)
    if (parsed.language) {
      language = parsed.language
    }
  } catch (e) {
    // If parsing fails, use default
  }

  return `Generate 1 lifestyle title (max 60 chars, emotional) + exactly 6 highlights in ${language}.

TITLE: Aspirational, benefit-focused (views/pool/location/privacy). No specs-only.

HIGHLIGHTS: 
- title (2-5 words), value (benefit), icon (from categories below)
- Use strongest selling points, no title repeat

ICON CATEGORIES: ${iconJson}

PROPERTY DATA: ${propertyData}

Return ONLY JSON:
{
  "title": "...",
  "highlights": [{"title": "...", "value": "...", "icon": "..."}]
}`
}
