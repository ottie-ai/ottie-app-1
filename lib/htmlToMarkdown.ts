/**
 * HTML to Markdown Converter
 * Converts cleaned HTML into markdown format for LLM processing
 * This markdown is intended as LLM-ready content for property description generation
 */

import TurndownService from 'turndown'
import { load } from 'cheerio'

/**
 * Convert cleaned HTML to markdown
 * 
 * This function performs a light cleanup using Cheerio before conversion:
 * - Removes obvious noise tags: script, style, noscript, iframe, svg, canvas
 * - Preserves layout divs and real content
 * - If <main> exists, converts only its HTML
 * - Otherwise, finds the element under <body> with the largest text content
 * 
 * @param cleanHtml - The cleaned HTML string from Cheerio processing
 * @returns Markdown string ready for LLM processing
 */
export function htmlToMarkdown(cleanHtml: string): string {
  if (!cleanHtml || cleanHtml.trim().length === 0) {
    return ''
  }

  // Light cleanup with Cheerio - remove only obvious noise
  const $ = load(cleanHtml)
  
  // Extract image URLs from scripts before removing them
  const imageUrlsFromScripts: string[] = []
  
  // Check script tags for image URLs (like cleanHtml does)
  $('script').each((_, el) => {
    const $el = $(el)
    const content = $el.html() || $el.text() || ''
    
    // Check for image URLs in the script content
    const imagePatterns = [
      /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|tif)(\?|"|'|\s|,|})/i,
      /"image":\s*"https?:\/\//i,
      /"imageUrl":\s*"https?:\/\//i,
      /"url":\s*"https?:\/\/[^"]*\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)/i,
      /photos\./i,
      /images?\./i,
      /img[^"]*\.(jpg|jpeg|png|gif|webp)/i,
    ]
    
    const hasImageLinks = imagePatterns.some(pattern => pattern.test(content))
    
    if (hasImageLinks) {
      // Extract image URLs from the script content
      const urlPattern = /https?:\/\/[^\s"',}]+\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|tif)(\?[^\s"',}]*)?/gi
      const matches = content.match(urlPattern)
      if (matches) {
        imageUrlsFromScripts.push(...matches)
      }
    }
  })
  
  // Remove obvious noise tags (but scripts with images are already processed)
  $('script, style, noscript, iframe, svg, canvas').remove()
  
  let contentToConvert: string
  
  // Check if <main> element exists
  const mainElement = $('main').first()
  if (mainElement.length > 0) {
    // Convert only the main element's HTML
    contentToConvert = mainElement.html() || ''
  } else {
    // Check if we have a body element (cleaned HTML might not have one)
    const body = $('body')
    if (body.length > 0) {
      // Find the element under <body> with the largest text content
      let largestElement = body
      let largestTextLength = body.text().length
      
      body.children().each((_, el) => {
        const $el = $(el)
        const textLength = $el.text().length
        if (textLength > largestTextLength) {
          largestTextLength = textLength
          largestElement = $el
        }
      })
      
      contentToConvert = largestElement.html() || body.html() || cleanHtml
    } else {
      // No body tag - find the root element with the largest text content
      const root = $.root()
      let largestElement = root
      let largestTextLength = root.text().length
      
      root.children().each((_, el) => {
        const $el = $(el)
        const textLength = $el.text().length
        if (textLength > largestTextLength) {
          largestTextLength = textLength
          largestElement = $el
        }
      })
      
      contentToConvert = largestElement.html() || cleanHtml
    }
  }
  
  // If no content found, use the original cleaned HTML
  if (!contentToConvert || contentToConvert.trim().length === 0) {
    contentToConvert = cleanHtml
  }
  
  // Configure Turndown service
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
  })
  
  // Convert to markdown
  let markdown = turndownService.turndown(contentToConvert)
  
  // Add image URLs from scripts to the markdown
  // Remove duplicates and add them as image links at the end
  const uniqueImageUrls = [...new Set(imageUrlsFromScripts)]
  if (uniqueImageUrls.length > 0) {
    const imageLinks = uniqueImageUrls.map(url => `![Image](${url})`).join('\n')
    markdown = markdown + (markdown.trim() ? '\n\n' : '') + imageLinks
  }
  
  return markdown
}
