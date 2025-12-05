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
 */
function scoreImageUrl(url: string): { score: number; width?: number } {
  // Check for uncropped_scaled_within pattern
  const uncroppedMatch = url.match(/uncropped_scaled_within_(\d+)_\d+/i)
  if (uncroppedMatch) {
    const width = parseInt(uncroppedMatch[1], 10)
    // Return a high base score + width (so larger widths score higher)
    return { score: 1000000 + width, width }
  }
  
  // Check file extension preference
  const extension = url.toLowerCase().match(/\.([a-z0-9]+)(\?|$)/)?.[1] || ''
  let extensionScore = 0
  
  if (extension === 'jpg') {
    extensionScore = 1000
  } else if (extension === 'jpeg') {
    extensionScore = 900
  } else if (extension === 'webp') {
    extensionScore = 800
  } else {
    extensionScore = 100
  }
  
  // Add URL length as final tiebreaker
  const lengthScore = url.length
  
  return { score: extensionScore + lengthScore }
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
  // Process in reverse order to avoid index shifting issues
  let cleanedMarkdown = markdown
  
  // Find all positions of images to remove (with their full context)
  const matchesToRemove = matches.filter(m => urlsToRemove.has(m.url))
  
  // Process in reverse order to avoid index shifting
  for (let i = matchesToRemove.length - 1; i >= 0; i--) {
    const imageMatch = matchesToRemove[i]
    
    // Find the position of this image in the current markdown
    // Use a more specific search to avoid matching partial strings
    const searchStart = cleanedMarkdown.lastIndexOf(imageMatch.fullMatch)
    if (searchStart === -1) {
      // Already removed or not found
      continue
    }
    
    // Verify this is actually the full match (not part of a larger string)
    const before = searchStart > 0 ? cleanedMarkdown[searchStart - 1] : ''
    const after = searchStart + imageMatch.fullMatch.length < cleanedMarkdown.length 
      ? cleanedMarkdown[searchStart + imageMatch.fullMatch.length] 
      : ''
    
    // Find the start of the line (or beginning of string)
    let lineStart = searchStart
    while (lineStart > 0 && cleanedMarkdown[lineStart - 1] !== '\n') {
      lineStart--
    }
    
    // Find the end of the line (or end of string)
    let lineEnd = searchStart + imageMatch.fullMatch.length
    while (lineEnd < cleanedMarkdown.length && cleanedMarkdown[lineEnd] !== '\n') {
      lineEnd++
    }
    
    // Check if the line contains only whitespace and the image
    const line = cleanedMarkdown.substring(lineStart, lineEnd)
    const lineWithoutImage = line.replace(imageMatch.fullMatch, '').trim()
    
    // Only remove if the line is empty after removing the image
    // This ensures we don't remove images that are inline with other content
    if (lineWithoutImage === '') {
      // Remove the entire line including the newline after it (if present)
      const removeEnd = lineEnd < cleanedMarkdown.length ? lineEnd + 1 : lineEnd
      cleanedMarkdown = cleanedMarkdown.substring(0, lineStart) + cleanedMarkdown.substring(removeEnd)
    } else {
      // Image is inline with other content, just remove the image markdown itself
      cleanedMarkdown = cleanedMarkdown.substring(0, searchStart) + cleanedMarkdown.substring(searchStart + imageMatch.fullMatch.length)
    }
  }
  
  return {
    markdown: cleanedMarkdown,
    keptUrls,
  }
}
