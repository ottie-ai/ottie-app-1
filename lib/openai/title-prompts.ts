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
  currentHighlights?: any[],
  language?: string
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
    distance: { label: "Proximity & Distance", icons: ["MapPin", "Signpost", "Compass", "MapTrifold", "ArrowRight"] },
    trending: { label: "Trending & Popular", icons: ["TrendUp", "Fire", "Heart", "Star", "Lightning"] },
    miscellaneous: { label: "General", icons: ["Check", "Plus", "Info", "CheckCircle"] }
  }

  const iconJson = JSON.stringify(iconCategories, null, 2)

  // Use provided language or try to parse from propertyData, default to 'en'
  let detectedLanguage = language || 'en'
  if (!language) {
    try {
      const parsed = JSON.parse(propertyData)
      if (parsed.language) {
        detectedLanguage = parsed.language
      }
    } catch (e) {
      // If parsing fails, try to extract from text format
      const languageMatch = propertyData.match(/Language:\s*(\w+)/i)
      if (languageMatch) {
        detectedLanguage = languageMatch[1]
      }
    }
  }

  return `You are a copywriter for a high-end real estate agency.

TASK: Generate 1 emotional title + exactly 6 UNIQUE highlights in ${detectedLanguage}.

INPUT DATA: ${propertyData}

STRICT RULES FOR HIGHLIGHTS:

1. **BE SPECIFIC:** Never say "Large Garden". Say "17,000m² Palm Garden". Never say "Good Views". Say "180° Atlantic Ocean View".

2. **USE DATA:** Extract numbers, brand names (Miele, Bosch), materials (Marble, Oak), or specific locations from the input.

3. **NO FLUFF:** Banned words: "Beautiful", "Stunning", "Amazing", "Perfect", "Nice". Use descriptive words instead.

4. **DIVERSITY:** Do not generate 2 highlights about the same thing (e.g., don't have "Pool" and "Exterior" if they mean the same).

EXAMPLES:

❌ BAD: "Modern Kitchen - Fully equipped kitchen"

✅ GOOD: "Gourmet Chef's Kitchen - Miele appliances & granite island"

❌ BAD: "Great Location - Close to shops"

✅ GOOD: "Walkable Lifestyle - 5 min stroll to San Juan Center"

ICON CATEGORIES: ${iconJson}

Return ONLY JSON:
{
  "title": "...",
  "highlights": [
    {
      "title": "...", // Max 4 words, punchy
      "value": "...", // Max 10 words, specific details
      "icon": "..." // Exact icon name from categories
    }
  ]
}`
}
