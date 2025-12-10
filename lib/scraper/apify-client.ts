/**
 * Apify API Client
 * Handles communication with Apify API to run actors and retrieve results
 */

import { ApifyScraperConfig } from './apify-scrapers'

export interface ApifyResult {
  data: any // The JSON data returned by the Apify actor
  provider: 'apify'
  scraperId: string
  actorId: string
  duration: number
}

/**
 * Run an Apify actor and wait for results
 * 
 * @param scraper - Apify scraper configuration
 * @param url - URL to scrape
 * @param timeout - Timeout in milliseconds (default: 170000 = 170 seconds)
 * @returns ApifyResult with JSON data from the actor
 */
export async function runApifyActor(
  scraper: ApifyScraperConfig,
  url: string,
  timeout: number = 170000
): Promise<ApifyResult> {
  const apiToken = process.env.APIFY_API_TOKEN
  
  if (!apiToken) {
    throw new Error('APIFY_API_TOKEN is not configured')
  }

  console.log(`🔵 [Apify:${scraper.name}] Scraping URL:`, url)
  const callStartTime = Date.now()

  // Build input for the actor
  const input = scraper.buildInput(url)
  
  console.log(`🔵 [Apify:${scraper.name}] Actor input:`, JSON.stringify(input, null, 2))

  // Set timeout for entire operation
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // Step 1: Start the actor run
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${scraper.actorId}/runs?token=${apiToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      }
    )

    if (!runResponse.ok) {
      const errorText = await runResponse.text()
      throw new Error(`Apify API error: ${runResponse.status} ${runResponse.statusText} - ${errorText}`)
    }

    const runData = await runResponse.json()
    const runId = runData.data.id
    const defaultDatasetId = runData.data.defaultDatasetId

    console.log(`🔵 [Apify:${scraper.name}] Run started with ID: ${runId}`)
    console.log(`🔵 [Apify:${scraper.name}] Default dataset ID: ${defaultDatasetId}`)

    // Step 2: Poll for run completion
    let runStatus = runData.data.status
    let pollAttempts = 0
    const maxPollAttempts = Math.floor(timeout / 5000) // Poll every 5 seconds
    
    while (runStatus !== 'SUCCEEDED' && runStatus !== 'FAILED' && runStatus !== 'ABORTED') {
      if (pollAttempts >= maxPollAttempts) {
        throw new Error(`Apify run timeout after ${timeout / 1000} seconds`)
      }

      // Wait 5 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 5000))
      pollAttempts++

      // Check run status
      const statusResponse = await fetch(
        `https://api.apify.com/v2/acts/${scraper.actorId}/runs/${runId}?token=${apiToken}`,
        { signal: controller.signal }
      )

      if (!statusResponse.ok) {
        throw new Error(`Failed to check run status: ${statusResponse.status}`)
      }

      const statusData = await statusResponse.json()
      runStatus = statusData.data.status

      console.log(`🔵 [Apify:${scraper.name}] Run status: ${runStatus} (attempt ${pollAttempts}/${maxPollAttempts})`)
    }

    if (runStatus === 'FAILED' || runStatus === 'ABORTED') {
      throw new Error(`Apify run ${runStatus.toLowerCase()}: ${runId}`)
    }

    // Step 3: Fetch results from dataset
    console.log(`🔵 [Apify:${scraper.name}] Fetching results from dataset...`)
    
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${apiToken}`,
      { signal: controller.signal }
    )

    if (!datasetResponse.ok) {
      throw new Error(`Failed to fetch dataset: ${datasetResponse.status}`)
    }

    const datasetItems = await datasetResponse.json()

    clearTimeout(timeoutId)
    const callDuration = Date.now() - callStartTime

    console.log(`✅ [Apify:${scraper.name}] Successfully scraped URL, items count: ${datasetItems.length} (${callDuration}ms)`)

    // Return the data
    return {
      data: datasetItems, // Return all items (usually array with 1 item for detail scrapers)
      provider: 'apify',
      scraperId: scraper.id,
      actorId: scraper.actorId,
      duration: callDuration,
    }
  } catch (error: any) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      throw new Error(`Apify timeout after ${timeout / 1000} seconds`)
    }

    throw new Error(`Apify error: ${error.message || 'Unknown error'}`)
  }
}





