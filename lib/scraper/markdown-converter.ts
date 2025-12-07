/**
 * Universal HTML to Markdown Converter
 * Uses Mozilla Readability + Turndown for vendor-agnostic conversion
 * 
 * This is the "secret weapon" - same algorithm used by Firefox Reader View
 * Works with any HTML source (ScraperAPI, Firecrawl, Puppeteer, etc.)
 */

import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import TurndownService from 'turndown'

export interface MarkdownResult {
  markdown: string
  title: string | null
  excerpt: string | null
  byline: string | null
  length: number // Character count of extracted content
  siteName: string | null
}

/**
 * Convert raw HTML to clean Markdown using Mozilla Readability
 * 
 * This function:
 * 1. Uses Readability to extract main content (removes nav, footer, ads, sidebars)
 * 2. Converts clean HTML to Markdown using Turndown
 * 
 * Benefits:
 * - Vendor agnostic - works with any HTML source
 * - Smart content extraction - analyzes DOM structure and text density
 * - No need for per-site selectors - works universally
 * - Same algorithm as Firefox/Safari Reader View
 * 
 * @param rawHtml - Raw HTML from any scraper
 * @returns MarkdownResult with clean markdown and metadata
 */
export function htmlToMarkdownUniversal(rawHtml: string): MarkdownResult {
  console.log('🔵 [Markdown] Starting universal conversion...')
  
  try {
    // 1. Create DOM environment (Readability needs real DOM, not just string)
    const dom = new JSDOM(rawHtml, {
      url: 'https://example.com', // Dummy URL for relative link resolution
    })
    
    // 2. Use Readability to extract main content
    // This is the magic - removes nav, footer, ads, sidebars automatically
    const reader = new Readability(dom.window.document, {
      // Options for better content extraction
      charThreshold: 500, // Minimum character count for valid content
      classesToPreserve: ['property', 'listing', 'real-estate', 'details'], // Preserve real estate specific classes
    })
    
    const article = reader.parse()
    
    // If Readability found nothing (rare), fall back to body content
    let cleanHtml: string
    let title: string | null = null
    let excerpt: string | null = null
    let byline: string | null = null
    let length = 0
    let siteName: string | null = null
    
    if (article) {
      cleanHtml = article.content
      title = article.title || null
      excerpt = article.excerpt || null
      byline = article.byline || null
      length = article.length
      siteName = article.siteName || null
      
      console.log('✅ [Markdown] Readability extracted content:', {
        title,
        length,
        excerpt: excerpt?.substring(0, 100),
      })
    } else {
      console.warn('⚠️ [Markdown] Readability found no content, using body fallback')
      cleanHtml = dom.window.document.body.innerHTML || rawHtml
    }
    
    // 3. Convert clean HTML to Markdown using Turndown
    const turndownService = new TurndownService({
      headingStyle: 'atx', // Use # for headings
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '_',
      strongDelimiter: '**',
    })
    
    // Add custom rules for better conversion
    turndownService.addRule('strikethrough', {
      filter: ['del', 's', 'strike'],
      replacement: (content) => `~~${content}~~`,
    })
    
    // Remove empty paragraphs and excessive whitespace
    turndownService.addRule('removeEmptyParagraphs', {
      filter: (node) => {
        return (
          node.nodeName === 'P' &&
          node.textContent?.trim().length === 0
        )
      },
      replacement: () => '',
    })
    
    const markdown = turndownService.turndown(cleanHtml)
    
    console.log('✅ [Markdown] Conversion complete, markdown length:', markdown.length)
    
    return {
      markdown,
      title,
      excerpt,
      byline,
      length,
      siteName,
    }
  } catch (error) {
    console.error('🔴 [Markdown] Conversion failed:', error)
    
    // Fallback: return raw HTML as markdown (better than nothing)
    return {
      markdown: rawHtml,
      title: null,
      excerpt: null,
      byline: null,
      length: 0,
      siteName: null,
    }
  }
}

/**
 * Legacy export for backwards compatibility
 * @deprecated Use htmlToMarkdownUniversal instead
 */
export function htmlToMarkdown(html: string): string {
  const result = htmlToMarkdownUniversal(html)
  return result.markdown
}
