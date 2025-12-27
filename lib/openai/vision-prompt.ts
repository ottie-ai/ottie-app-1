/**
 * Vision Analysis Prompts
 * Prompts for Llama 3.2 Vision model to analyze real estate images
 */

/**
 * Get the image analysis prompt for evaluating real estate photos
 * Used to select the best hero image for a luxury real estate website
 * 
 * @param imageCount - Number of images being analyzed
 * @returns Complete prompt string for vision analysis
 */
export function getImageAnalysisPrompt(imageCount: number): string {
  return `Role: You are a professional real estate photographer and curator.

Task: Analyze these ${imageCount} images and select the SINGLE BEST image for the "Hero Section" (main banner) of a luxury real estate website.

For each image, evaluate these criteria on a scale of 0-10:

1. **Composition** (0-10): Wide angle, symmetrical, balanced framing. Does the shot use professional composition techniques?

2. **Lighting** (0-10): Bright, natural light, no dark corners. Is the lighting flattering and professional?

3. **Wow Factor** (0-10): Does it sell the lifestyle? Consider: ocean/mountain views, pools, modern architecture, dramatic facades, luxury interiors. Would a buyer be emotionally drawn to this image?

4. **Quality** (0-10): Sharpness, resolution feel, professional photography quality. Does it look like a professional photo?

Calculate the overall score as the average of all four criteria.

The BEST image should be the one most suitable for a hero banner - typically an exterior shot, pool area, dramatic view, or stunning living space that creates an emotional first impression.

Return ONLY valid JSON with this exact structure:
{
  "best_image_index": <0-based index of the best image>,
  "reasoning": "<1-2 sentences explaining why this specific image is best for the hero section>",
  "images": [
    {
      "index": 0,
      "description": "<concise description of what's in the image - 10-20 words>",
      "score": <overall score 0-10, average of the four criteria>,
      "composition": <0-10>,
      "lighting": <0-10>,
      "wow_factor": <0-10>,
      "quality": <0-10>
    }
  ]
}

IMPORTANT:
- Return one object per image in the "images" array, in the same order as provided
- The "index" field should match the image position (0, 1, 2, etc.)
- All scores must be integers from 0 to 10
- The "best_image_index" must correspond to an actual image index`
}

