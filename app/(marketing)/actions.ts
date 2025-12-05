'use server'

/**
 * Scrape a URL using ScraperAPI
 * Returns the HTML content of the page
 */
export async function scrapeUrl(url: string) {
  try {
    // Validate URL format
    try {
      new URL(url)
    } catch {
      return { 
        error: 'Invalid URL format. Please enter a valid URL (e.g., https://example.com)' 
      }
    }

    const apiKey = process.env.SCRAPERAPI_KEY
    
    if (!apiKey) {
      console.error('SCRAPERAPI_KEY is not configured')
      return { 
        error: 'Scraper API is not configured. Please contact support.' 
      }
    }

    // Call ScraperAPI with the URL
    const scraperUrl = `http://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(url)}`
    
    console.log('🔵 [scrapeUrl] Scraping URL:', url)
    
    // Start timing the API call
    const callStartTime = Date.now()
    
    const response = await fetch(scraperUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('🔴 [scrapeUrl] ScraperAPI error:', response.status, response.statusText)
      return { 
        error: `Failed to scrape URL: ${response.status} ${response.statusText}` 
      }
    }

    const html = await response.text()
    
    // Calculate call duration
    const callEndTime = Date.now()
    const callDuration = callEndTime - callStartTime
    
    console.log('✅ [scrapeUrl] Successfully scraped URL, content length:', html.length, `(${callDuration}ms)`)

    return { 
      success: true,
      html,
      url,
      scrapedAt: new Date().toISOString(),
      timing: {
        scrapeCall: callDuration, // Time for this specific API call
      }
    }
  } catch (error) {
    console.error('🔴 [scrapeUrl] Error:', error)
    return { 
      error: error instanceof Error ? error.message : 'Failed to scrape URL' 
    }
  }
}
