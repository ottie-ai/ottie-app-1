'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export default function TestResultsPage() {
  const searchParams = useSearchParams()
  const url = searchParams.get('url')
  const scrapedAt = searchParams.get('scrapedAt')
  const htmlContent = searchParams.get('html')
  const scrapeCallTime = searchParams.get('scrapeCallTime')
  const totalTime = searchParams.get('totalTime')
  
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState({
    length: 0,
    lines: 0,
    images: 0,
    links: 0,
  })

  // Format milliseconds to readable time (e.g., "1.23s" or "234ms")
  const formatTime = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`
    }
    return `${(ms / 1000).toFixed(2)}s`
  }

  useEffect(() => {
    if (htmlContent) {
      // Calculate basic stats
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlContent, 'text/html')
      
      setStats({
        length: htmlContent.length,
        lines: htmlContent.split('\n').length,
        images: doc.querySelectorAll('img').length,
        links: doc.querySelectorAll('a').length,
      })
    }
  }, [htmlContent])

  const handleCopy = () => {
    if (htmlContent) {
      navigator.clipboard.writeText(htmlContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="dark bg-[#08000d] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-20">
        {/* Back Button */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-12">
          <Typography variant="h1" className="mb-4 text-white">
            Scrape Results
          </Typography>
          
          {/* Generation Time Display */}
          {(scrapeCallTime || totalTime) && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-white/20 rounded-lg p-4 bg-gradient-to-br from-white/[0.05] to-white/[0.02]">
                <Typography variant="small" className="text-white/60 mb-1">
                  Scrape API Call
                </Typography>
                <Typography variant="h2" className="text-white border-none">
                  {scrapeCallTime ? formatTime(parseInt(scrapeCallTime)) : 'N/A'}
                </Typography>
              </div>
              <div className="border border-white/20 rounded-lg p-4 bg-gradient-to-br from-white/[0.05] to-white/[0.02]">
                <Typography variant="small" className="text-white/60 mb-1">
                  Total Generation Time
                </Typography>
                <Typography variant="h2" className="text-white border-none">
                  {totalTime ? formatTime(parseInt(totalTime)) : 'N/A'}
                </Typography>
              </div>
            </div>
          )}
          
          {url && (
            <div className="space-y-2">
              <Typography variant="small" className="text-white/60">
                URL: <span className="text-white/80 font-mono">{url}</span>
              </Typography>
              {scrapedAt && (
                <Typography variant="small" className="text-white/60">
                  Scraped at: <span className="text-white/80">{new Date(scrapedAt).toLocaleString()}</span>
                </Typography>
              )}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        {htmlContent && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
              <Typography variant="small" className="text-white/60 mb-1">
                Content Size
              </Typography>
              <Typography variant="h3" className="text-white border-none">
                {(stats.length / 1024).toFixed(1)} KB
              </Typography>
            </div>
            <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
              <Typography variant="small" className="text-white/60 mb-1">
                Lines of Code
              </Typography>
              <Typography variant="h3" className="text-white border-none">
                {stats.lines.toLocaleString()}
              </Typography>
            </div>
            <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
              <Typography variant="small" className="text-white/60 mb-1">
                Images Found
              </Typography>
              <Typography variant="h3" className="text-white border-none">
                {stats.images}
              </Typography>
            </div>
            <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
              <Typography variant="small" className="text-white/60 mb-1">
                Links Found
              </Typography>
              <Typography variant="h3" className="text-white border-none">
                {stats.links}
              </Typography>
            </div>
          </div>
        )}

        {/* HTML Content Display */}
        {htmlContent ? (
          <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
              <Typography variant="small" className="text-white/80 font-medium">
                HTML Content
              </Typography>
              <Button
                onClick={handleCopy}
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy HTML
                  </>
                )}
              </Button>
            </div>
            <div className="p-4 max-h-[600px] overflow-auto">
              <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-words">
                {htmlContent}
              </pre>
            </div>
          </div>
        ) : (
          <div className="border border-white/10 rounded-lg p-12 text-center bg-white/[0.02]">
            <Typography variant="lead" className="text-white/60">
              No scrape results available. Please try scraping a URL from the homepage.
            </Typography>
            <Link href="/">
              <Button className="mt-6 bg-white text-black hover:bg-white/90">
                Go to Homepage
              </Button>
            </Link>
          </div>
        )}

        {/* Next Steps Info */}
        {htmlContent && (
          <div className="mt-8 border border-white/10 rounded-lg p-6 bg-white/[0.02]">
            <Typography variant="h4" className="text-white mb-3 border-none">
              🚀 Next Steps
            </Typography>
            <Typography variant="small" className="text-white/60">
              This is a test page showing the raw HTML content from ScraperAPI. 
              Future enhancements will include:
            </Typography>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li className="flex items-start gap-2">
                <span className="text-white/40">•</span>
                AI-powered content extraction (property details, images, descriptions)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/40">•</span>
                Automatic site generation from extracted data
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/40">•</span>
                Template selection and customization
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/40">•</span>
                Direct import to site builder
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
