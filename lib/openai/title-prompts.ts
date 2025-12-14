/**
 * OpenAI Title Generation Prompts
 * Centralized prompts for title and highlights generation
 */

/**
 * Get the title and highlights generation prompt
 * Returns JSON with title, subtitle and highlights
 * 
 * @param propertyData - The property data (JSON stringified config from first OpenAI call)
 * @param language - Optional language code (ISO 2-letter)
 * @returns Complete prompt string for title, subtitle and highlights generation
 */
export function getTitleGenerationPrompt(
  propertyData: string,
  language?: string
): string {
  const iconCategories = {
    location: { label: "Location & Area", icons: ["MapPin", "Compass", "GlobeHemisphereWest", "Signpost", "MapTrifold", "City", "Hospital", "Church"] },
    view: { label: "Views & Scenery", icons: ["Mountains", "SunHorizon", "Tree", "Waves", "Binoculars", "MoonStars"] },
    bedroom: { label: "Bedrooms", icons: ["Bed", "Door", "DoorOpen"] },
    bathroom: { label: "Bathrooms", icons: ["Toilet", "Bathtub", "Shower"] },
    kitchen: { label: "Kitchen", icons: ["Oven", "CookingPot", "ForkKnife", "Coffee", "ChefHat", "Wine"] },
    luxury: { label: "Luxury & Premium", icons: ["Crown", "Diamond", "Sparkle", "Asterisk", "Star", "Champagne", "Peace"] },
    pool: { label: "Pool & Water", icons: ["SwimmingPool", "Waves", "Drop", "Fish", "Boat"] },
    fitness: { label: "Fitness & Wellness", icons: ["Barbell", "Basketball", "CourtBasketball"] },
    parking: { label: "Parking", icons: ["CarSimple", "Garage", "Car", "Bicycle"] },
    outdoor: { label: "Outdoor & Garden", icons: ["Tree", "Flower", "PottedPlant", "Plant", "Park", "Fire", "Campfire", "Cactus", "FlowerLotus"] },
    security: { label: "Security & Safety", icons: ["ShieldCheck", "Lock", "Camera", "Alarm"] },
    heating_cooling: { label: "Climate Control", icons: ["Thermometer", "Fan", "Sun", "Snowflake"] },
    energy: { label: "Energy & Utilities", icons: ["SolarPanel", "Lightning", "BatteryFull", "Windmill", "Plug", "ChargingStation"] },
    price: { label: "Price & Financial", icons: ["CurrencyDollar", "CurrencyEur", "CurrencyGbp", "Coin", "Receipt"] },
    size: { label: "Size & Measurements", icons: ["Ruler"] },
    elevator: { label: "Elevator & Accessibility", icons: ["Elevator", "Wheelchair", "WheelchairMotion"] },
    building: { label: "Building & Structure", icons: ["House", "Building", "Buildings", "CastleTurret", "BuildingApartment", "Warehouse"] },
    appliances: { label: "Appliances & Furniture", icons: ["Couch", "Chair", "Table", "Lamp", "Desk", "OfficeChair"] },
    storage: { label: "Storage & Space", icons: ["Dresser", "Books", "Folder", "Archive", "Backpack"] },
    distance: { label: "Proximity & Distance", icons: ["MapPin", "Signpost", "Compass", "MapTrifold", "ArrowRight", "ShoppingBagOpen", "AirplaneTilt"] },
    trending: { label: "Trending & Popular", icons: ["TrendUp", "Fire", "Heart", "Star", "Lightning"] },
    transport: { label: "Transport & Transit", icons: ["Bus", "Subway", "Train"] },
    pets: { label: "Pets & Animals", icons: ["Cat", "Dog", "PawPrint"] },
    miscellaneous: { label: "General", icons: ["Check", "Plus", "Info", "CheckCircle", "BabyCarriage"] }
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

TASK: Generate EXACTLY 1 emotional, aspirational TITLE (max 8 words) + 1 SUBTITLE (20-40 words) + 6 UNIQUE HIGHLIGHTS in ${detectedLanguage}.

INPUT DATA: ${propertyData}

TITLE RULES:
- Lifestyle-focused: Mediterranean escape, Oceanfront sanctuary, Private hilltop retreat
- Location + emotion: Cascais Coastal Masterpiece, Miami Sunset Penthouse
- Aspirational: Where Luxury Meets Horizon, Timeless Coastal Elegance
- Max 8 words, punchy, hero-section ready
- NO: "Beautiful house", "3 bed villa", "Modern property" (too generic)

SUBTITLE RULES:
- Lifestyle narrative: 20-40 words that paint daily life
- Buyer immersion: Use phrases like "Imagine waking...", "Your mornings...", "Host unforgettable...", "Wake to..."
- Paint daily life: Describe specific moments and experiences (e.g., "Wake to Atlantic sunrises from your infinity pool terrace. Host unforgettable evenings on the panoramic deck. Privacy, luxury, and coastal elegance await in your private Cascais sanctuary.")
- Evocative and aspirational: Make the buyer visualize living there
- NO generic descriptions: Focus on specific, sensory experiences

STRICT RULES FOR HIGHLIGHTS:

1. **BE SPECIFIC:** Never say "Large Garden". Say "17,000m² Palm Garden". Never say "Good Views". Say "180° Atlantic Ocean View".

2. **USE DATA:** Extract numbers, brand names (Miele, Bosch), materials (Marble, Oak), or specific locations from the input.

3. **NO FLUFF:** Banned words: "Beautiful", "Stunning", "Amazing", "Perfect", "Nice". Use descriptive words instead.

4. **DIVERSITY:** Do not generate 2 highlights about the same thing (e.g., don't have "Pool" and "Exterior" if they mean the same). do not use the same words in both title and value

EXAMPLES:

❌ BAD: "Modern Kitchen - Fully equipped kitchen"

✅ GOOD: "Gourmet Chef's Kitchen - Miele appliances & granite island"

❌ BAD: "Great Location - Close to shops"

✅ GOOD: "Walkable Lifestyle - 5 min stroll to San Juan Center"

ICON CATEGORIES: ${iconJson}

Return ONLY JSON:
{
  "title": "...",
  "subtitle": "...", // 20-40 words, lifestyle narrative with buyer immersion
  "highlights": [
    {
      "title": "...", // Max 4 words, punchy
      "value": "...", // Max 10 words, specific details
      "icon": "..." // Exact icon name from categories
    }
  ]
}`
}
