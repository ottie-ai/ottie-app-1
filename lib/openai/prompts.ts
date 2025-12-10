/**
 * OpenAI Prompts
 * Centralized prompts for OpenAI API calls
 */

import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Get system message for real estate config generation
 * @returns System message string
 */
export function getRealEstateConfigSystemMessage(): string {
  return `You are an AI assistant inside a SaaS tool that generates real estate one‑pager websites.

Role:

- Analyze LLM‑ready markdown of property listings.

- Produce clean, structured JSON configs that can be rendered directly into a one‑pager.

- Create emotionally appealing, lifestyle‑focused titles and highlight cards with icons.

Behavior rules:

- Always respond with VALID JSON only, no explanations or extra text.

- Never include markdown, prose, or code fences in your reply.

- Use only fields and structure specified in the user's instructions.

- Do not invent facts that are not clearly supported or implied by the input.

- Ignore navigation menus, similar properties, recommendations, footer content, and portal boilerplate.

- When assigning icons, use only the icon categories and icon names provided by the user. If unsure, use a neutral fallback as instructed.

Style:

- Titles must be short, memorable, and lifestyle‑oriented (focus on feelings, experience, and benefits, not just "3 bedroom apartment").

- Highlights must be concise, punchy, and benefit‑driven.

If there is any ambiguity, prefer conservative, safe defaults rather than guessing.`
}

/**
 * Get the real estate config generation prompt
 * 
 * @param dataType - Type of data: 'apify' for JSON data, 'text' for property text
 * @param dataToProcess - The actual data to process (JSON stringified or text)
 * @param sampleConfig - Optional sample config (will be loaded if not provided)
 * @returns Complete prompt string
 */
export function getRealEstateConfigPrompt(
  dataType: 'apify' | 'text',
  dataToProcess: string,
  sampleConfig?: any
): string {
  if (!sampleConfig) {
    const sampleConfigPath = join(process.cwd(), 'docs', 'site-config-sample.json')
    sampleConfig = JSON.parse(readFileSync(sampleConfigPath, 'utf-8'))
  }

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
    "heating_cooling": { label: "Climate Control", icons: ["Thermometer", "Fan", "AirVent", "Sun", "Snowflake"] },
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

  return `Analyze real estate listing. Fill JSON config for one-pager.

PRIORITY FIELDS (fill FIRST):

1. **language** (ISO 2-letter: en/es/de/cs/sk/fr/it) → ALL TEXT in this language

2. title (lifestyle-focused, emotional, max 60 chars)

3. currency (infer from symbol/location: $, €, £, Kč → USD/EUR/GBP/CZK)

4. price info extract number only

5. photos: list of main property photos, ideally JPEG or WebP and largest size you can find, no duplicates

6. beds, baths, living_area

7. description, exaclty as in the listing text, usually the longest text

8. highlights

8. property address

9. agent info

10. property type: Choose ONE from: HOUSE, TOWNHOUSE, CONDO, LAND, MULTI_FAMILY, MOBILE_HOME, APARTMENT, FARM_RANCH, OTHER

RULES:

- Missing = "" / 0 / []

- NO hallucinations, use ONLY listing data

- Ignore: similar properties, navigation, footers

- font: "Inter" (modern) or "Playfair Display" (luxury) based on property style

- brand_color: single HEX matching property style

- **highlights exactly 6**: Match to categories → pick icon:

- floorplan_url:
   - Try to find a dedicated floor plan file or image for this listing.
   - Accept formats: PDF, SVG, JPG, JPEG, PNG, WEBP.
   - Look for buttons or links labeled "Floor plan", "Plans", "Grundriss", "Plano", etc., or gallery images that clearly show a 2D floor plan

- completeness: percentage (0–100) of how many relevant fields in this JSON were successfully filled.

${iconJson}

JSON STRUCTURE:

${JSON.stringify(sampleConfig, null, 2)}

DATA TO PROCESS:

${dataToProcess}`
}
