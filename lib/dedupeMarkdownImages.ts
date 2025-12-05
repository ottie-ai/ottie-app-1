/**
 * Markdown Image Deduplication Utility
 * Removes duplicate image URLs that represent the same photo in different sizes/variants
 */

interface ImageMatch {
  fullMatch: string
  alt: string
  url: string
  line: string
}

/**
 * Extract base key from image URL for grouping
 * - Strips query params
 * - Takes everything before the first `-` in the filename
 * 
 * Example:
 * - `https://photos.zillowstatic.com/fp/da72d3855-uncropped_scaled_within_1536_1152.jpg`
 * - base key: `https://photos.zillowstatic.com/fp/da72d3855`
 */
function getBaseKey(url: string): string {
  // Remove query params
  const urlWithoutQuery = url.split('?')[0]
  
  // Find the last `/` to get the filename part
  const lastSlashIndex = urlWithoutQuery.lastIndexOf('/')
  if (lastSlashIndex === -1) {
    return urlWithoutQuery
  }
  
  const path = urlWithoutQuery.substring(0, lastSlashIndex + 1)
  const filename = urlWithoutQuery.substring(lastSlashIndex + 1)
  
  // Find the first `-` in the filename
  const firstDashIndex = filename.indexOf('-')
  if (firstDashIndex === -1) {
    // No dash found, return the full URL without query
    return urlWithoutQuery
  }
  
  // Return path + part before first dash
  return path + filename.substring(0, firstDashIndex)
}

/**
 * Score an image URL to determine which is "best" in a group
 * Higher score = better
 * 
 * Universal heuristics that work for various URL patterns:
 * - Prefers uncropped_scaled_within with largest width
 * - Extracts numeric dimensions from URL (e.g., _1536, _192, etc.)
 * - Prefers .jpg > .jpeg > .webp > others
 * - Falls back to longest URL
 */
function scoreImageUrl(url: string): { score: number; width?: number } {
  // Check for uncropped_scaled_within pattern (highest priority)
  const uncroppedMatch = url.match(/uncropped_scaled_within_(\d+)_\d+/i)
  if (uncroppedMatch) {
    const width = parseInt(uncroppedMatch[1], 10)
    // Return a very high base score + width (so larger widths score higher)
    return { score: 10000000 + width, width }
  }
  
  // Extract all numbers from the URL that might represent dimensions
  // Look for patterns like: _1536, _192, -1536, cc_ft_1536, etc.
  // This is universal and works for various URL patterns
  // Try multiple patterns to catch different formats
  const dimensionPatterns = [
    /[-_](\d{3,4})(?:[-_.]|$)/g,  // _1536, -192, etc.
    /_(\d{3,4})\./g,               // _1536.jpg
    /-(\d{3,4})\./g,               // -1536.jpg
  ]
  
  let maxDimension = 0
  
  for (const pattern of dimensionPatterns) {
    let match
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0
    while ((match = pattern.exec(url)) !== null) {
      const num = parseInt(match[1], 10)
      if (num > maxDimension && num < 10000) { // Reasonable dimension range
        maxDimension = num
      }
    }
  }
  
  // If we found dimension numbers, use them (but lower priority than uncropped)
  // Multiply by 1000 to give significant weight to larger dimensions
  // Also add a bonus if we found dimensions (prefer images with explicit sizes)
  const dimensionScore = maxDimension > 0 ? maxDimension * 1000 + 50000 : 0
  
  // Check file extension preference
  const extension = url.toLowerCase().match(/\.([a-z0-9]+)(\?|$)/)?.[1] || ''
  let extensionScore = 0
  
  if (extension === 'jpg') {
    extensionScore = 100
  } else if (extension === 'jpeg') {
    extensionScore = 90
  } else if (extension === 'webp') {
    extensionScore = 80
  } else {
    extensionScore = 10
  }
  
  // Add URL length as final tiebreaker (small weight)
  const lengthScore = url.length * 0.1
  
  return { 
    score: dimensionScore + extensionScore + lengthScore,
    width: maxDimension > 0 ? maxDimension : undefined
  }
}

/**
 * Deduplicate markdown images by grouping variants of the same photo
 * and keeping only the best (largest/highest quality) version
 */
export function dedupeMarkdownImages(markdown: string): { markdown: string; keptUrls: string[] } {
  // Regex to match markdown images: ![alt](url) or ![](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
  
  const matches: ImageMatch[] = []
  let match
  
  // Extract all image matches
  while ((match = imageRegex.exec(markdown)) !== null) {
    matches.push({
      fullMatch: match[0],
      alt: match[1],
      url: match[2],
      line: match[0],
    })
  }
  
  if (matches.length === 0) {
    return { markdown, keptUrls: [] }
  }
  
  // Group images by base key
  const groups = new Map<string, ImageMatch[]>()
  
  for (const imageMatch of matches) {
    const baseKey = getBaseKey(imageMatch.url)
    if (!groups.has(baseKey)) {
      groups.set(baseKey, [])
    }
    groups.get(baseKey)!.push(imageMatch)
  }
  
  // For each group, find the best image
  const keptUrls: string[] = []
  const urlsToRemove = new Set<string>()
  
  for (const [baseKey, group] of Array.from(groups.entries())) {
    if (group.length === 1) {
      // Only one image in group, keep it
      keptUrls.push(group[0].url)
      continue
    }
    
    // Score all images in the group
    const scored = group.map(img => ({
      ...img,
      score: scoreImageUrl(img.url),
    }))
    
    // Sort by score (descending) - highest score is best
    scored.sort((a, b) => {
      if (b.score.score !== a.score.score) {
        return b.score.score - a.score.score
      }
      // If scores are equal, prefer longer URL
      return b.url.length - a.url.length
    })
    
    // Keep the best one
    const best = scored[0]
    keptUrls.push(best.url)
    
    // Mark others for removal
    for (let i = 1; i < scored.length; i++) {
      urlsToRemove.add(scored[i].url)
    }
  }
  
  // Remove duplicate images from markdown
  // We need to remove the full line containing the image, but be careful
  // to only remove exact matches and preserve other content
  let cleanedMarkdown = markdown
  
  // Use regex to find and remove images that should be removed
  // Match: optional whitespace + image markdown + optional whitespace + newline
  // This ensures we remove standalone image lines cleanly
  // Reuse the same regex pattern (but create new instance for replace)
  const removeImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
  
  cleanedMarkdown = cleanedMarkdown.replace(removeImageRegex, (fullMatch, alt, url) => {
    // Check if this URL should be removed
    if (urlsToRemove.has(url)) {
      // Check if this is on its own line (with optional whitespace)
      // We'll remove it by returning empty string, but we need to handle newlines carefully
      // For now, return a special marker that we'll clean up
      return '\0REMOVE_IMAGE\0'
    }
    // Keep this image
    return fullMatch
  })
  
  // Now clean up the markers and their surrounding whitespace/newlines
  // Pattern: optional newline + whitespace + marker + whitespace + optional newline
  cleanedMarkdown = cleanedMarkdown.replace(/(\n?)\s*\0REMOVE_IMAGE\0\s*(\n?)/g, (match, beforeNewline, afterNewline) => {
    // If we have newlines on both sides, keep one
    if (beforeNewline === '\n' && afterNewline === '\n') {
      return '\n'
    }
    // If we have a newline on one side, keep it
    if (beforeNewline === '\n' || afterNewline === '\n') {
      return beforeNewline || afterNewline
    }
    // No newlines, remove everything
    return ''
  })
  
  // Also handle images at the start or end of the string
  cleanedMarkdown = cleanedMarkdown.replace(/^\s*\0REMOVE_IMAGE\0\s*\n?/gm, '')
  cleanedMarkdown = cleanedMarkdown.replace(/\n?\s*\0REMOVE_IMAGE\0\s*$/gm, '')
  
  return {
    markdown: cleanedMarkdown,
    keptUrls,
  }
}
