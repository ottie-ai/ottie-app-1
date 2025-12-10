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
    location: { label: "Location & Area", icons: ["MapPin", "Compass", "GlobeHemisphereWest", "SignpostTwo", "MapTrifold"] },
    view: { label: "Views & Scenery", icons: ["Mountains", "SunHorizon", "Tree", "Wave", "Binoculars"] },
    bedroom: { label: "Bedrooms", icons: ["Bed", "Door"] },
    bathroom: { label: "Bathrooms", icons: ["Toilet", "Bathtub", "Shower", "Sink"] },
    kitchen: { label: "Kitchen", icons: ["Fridge", "CookingPot", "KnifeFork", "Microwave"] },
    luxury: { label: "Luxury & Premium", icons: ["Crown", "Diamond", "Sparkle", "Asterisk", "SparkleStar"] },
    pool: { label: "Pool & Water", icons: ["SwimmingPool", "WaveSawtooth", "Water", "Droplet"] },
    parking: { label: "Parking", icons: ["CarSimple", "Garage", "ParkingCircle", "Car"] },
    outdoor: { label: "Outdoor & Garden", icons: ["Tree", "Flower", "PottedPlant", "Fence", "Gate"] },
    security: { label: "Security & Safety", icons: ["ShieldCheck", "Lock", "Camera", "Alarm"] },
    heating_cooling: { label: "Climate Control", icons: ["Thermometer", "Fan", "AirVent", "Sun", "Snowflake"] },
    energy: { label: "Energy & Utilities", icons: ["SolarPanel", "Lightning", "Battery", "Windmill"] },
    price: { label: "Price & Financial", icons: ["CurrencyDollar", "CurrencyEur", "CurrencyPound", "Coin", "Receipt"] },
    size: { label: "Size & Measurements", icons: ["Ruler", "Square", "Resize", "ArrowsOut"] },
    elevator: { label: "Elevator & Accessibility", icons: ["Elevator", "Wheelchair", "Accessibility"] },
    building: { label: "Building & Structure", icons: ["House", "Building", "Construction", "CastleTurret", "Skyscraper"] },
    appliances: { label: "Appliances & Furniture", icons: ["Sofa", "Chair", "Table", "Lamp", "Desk"] },
    storage: { label: "Storage & Space", icons: ["Wardrobe", "Bookshelf", "Box", "Folder"] },
    distance: { label: "Proximity & Distance", icons: ["MapPin", "Distance", "NavigationArrow", "Signpost"] },
    trending: { label: "Trending & Popular", icons: ["TrendingUp", "Fire", "Heart", "Star", "Bolt"] },
    miscellaneous: { label: "General", icons: ["Check", "Plus", "Info", "CheckCircle"] }
  }

  const iconJson = JSON.stringify(iconCategories, null, 2)

  return `You generate a SINGLE lifestyle-focused title and 6 marketing highlights for a real estate property.

LANGUAGE:

- Use the same language as in propertyData.language.

- All text (title + highlights) must be in this language.

TITLE REQUIREMENTS:

- Generate EXACTLY ONE title.

- Max 60 characters.

- Emotional, aspirational, and benefit-driven.

- Focus on lifestyle, experience, and unique selling points (views, pool, location, privacy, design, investment).

- Avoid dry spec-only titles like "3 Bedroom Apartment in X".

- Avoid generic phrases like "Beautiful Home" or "Amazing Property".

HIGHLIGHTS REQUIREMENTS:

- Exactly 6 items in the "highlights" array.

- Each highlight has: 

  - title: very short (2–5 words),

  - value: short, concrete benefit,

  - icon: Phosphor icon name.

- Use the property's strongest selling points (views, pool, outdoor space, location, luxury finishes, privacy, amenities).

- Do NOT repeat the title text in highlights.

- Match each highlight to the icon categories and choose the most appropriate icon.

ICON CATEGORIES:

${iconJson}

${currentTitle ? `CURRENT TITLE (optional to improve):\n${currentTitle}\n\n` : ''}${currentHighlights && currentHighlights.length ? `CURRENT HIGHLIGHTS (optional to improve):\n${JSON.stringify(currentHighlights, null, 2)}\n\n` : ''}PROPERTY DATA (from first call, JSON):

${propertyData}

OUTPUT:

Return ONLY a JSON object with this exact structure:

{

  "title": "final title here",

  "highlights": [

    {

      "title": "highlight title",

      "value": "highlight value",

      "icon": "IconName"

    }

  ]

}

No explanations, no markdown, no code fences. Only valid JSON.`
}
