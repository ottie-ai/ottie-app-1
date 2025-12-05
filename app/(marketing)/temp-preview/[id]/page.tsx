'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, ExternalLink, Code, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { getPreview, claimPreview } from '../../actions'
import { createClient } from '@/lib/supabase/client'
import type { PageConfig } from '@/types/builder'
import { PageRenderer } from '@/components/templates/SectionRenderer'

function PreviewContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const previewId = params.id as string
  const totalTime = searchParams.get('totalTime')
  
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [showRawHtml, setShowRawHtml] = useState(false)
  const [copied, setCopied] = useState(false)

  // Format milliseconds to readable time
  const formatTime = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`
    }
    return `${(ms / 1000).toFixed(2)}s`
  }

  // Load preview
  useEffect(() => {
    const loadPreview = async () => {
      try {
        const result = await getPreview(previewId)
        if ('error' in result) {
          setError(result.error || 'Failed to load preview')
          setLoading(false)
          return
        }
        setPreview(result.preview)
        setLoading(false)
      } catch (err) {
        setError('Failed to load preview')
        setLoading(false)
      }
    }
    
    if (previewId) {
      loadPreview()
    }
  }, [previewId])

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUser(user)
        
        // Get user's workspace
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id, name')
          .eq('owner_id', user.id)
          .single()
        
        setWorkspace(workspace)
      }
    }
    
    checkAuth()
  }, [])

  const handleClaim = async () => {
    if (!user || !workspace) {
      // Redirect to signup with preview_id
      router.push(`/signup?preview=${previewId}`)
      return
    }

    setClaiming(true)
    try {
      const result = await claimPreview(previewId, workspace.id, user.id)
      
      if ('error' in result) {
        setError(result.error)
        setClaiming(false)
        return
      }
      
      // Navigate to builder
      router.push(`/builder/${result.siteId}`)
    } catch (err) {
      setError('Failed to claim preview')
      setClaiming(false)
    }
  }

  const handleCopyRawHtml = () => {
    if (preview?.raw_html) {
      navigator.clipboard.writeText(preview.raw_html)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="dark bg-[#08000d] min-h-screen flex items-center justify-center">
        <Typography variant="h2" className="text-white">
          Loading preview...
        </Typography>
      </div>
    )
  }

  if (error || !preview) {
    return (
      <div className="dark bg-[#08000d] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <Typography variant="h1" className="mb-4 text-white">
            Preview Not Found
          </Typography>
          <Typography variant="lead" className="text-white/60 mb-6">
            {error || 'This preview may have expired or does not exist.'}
          </Typography>
          <Link href="/">
            <Button className="bg-white text-black hover:bg-white/90">
              Generate New Preview
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const config = preview.generated_config as PageConfig
  const scrapedData = preview.scraped_data

  return (
    <div className="dark bg-[#08000d] min-h-screen">
      {/* Header Bar */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#08000d]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <div className="h-4 w-px bg-white/20" />
              <Typography variant="small" className="text-white/60">
                Preview
              </Typography>
            </div>
            
            <div className="flex items-center gap-4">
              {totalTime && (
                <Typography variant="small" className="text-white/60">
                  Generated in {formatTime(parseInt(totalTime))}
                </Typography>
              )}
              <Button
                onClick={handleClaim}
                disabled={claiming}
                className="bg-white text-black hover:bg-white/90"
              >
                {claiming ? (
                  'Saving...'
                ) : user ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save as Site
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Sign Up to Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="min-h-screen">
        {config.sections && config.sections.length > 0 ? (
          <PageRenderer 
            sections={config.sections} 
            theme={config.theme}
          />
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <Typography variant="h2" className="text-white/60">
              No content available
            </Typography>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="border-t border-white/10 bg-white/[0.02] py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Typography variant="h4" className="text-white mb-2 border-none">
                Source
              </Typography>
              <a 
                href={preview.source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white inline-flex items-center gap-2"
              >
                {preview.source_url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            
            {scrapedData && (
              <div>
                <Typography variant="h4" className="text-white mb-2 border-none">
                  Extracted Data
                </Typography>
                <div className="space-y-1 text-sm text-white/60">
                  {scrapedData.title && (
                    <div><strong className="text-white/80">Title:</strong> {scrapedData.title}</div>
                  )}
                  {scrapedData.price && (
                    <div><strong className="text-white/80">Price:</strong> ${scrapedData.price.toLocaleString()}</div>
                  )}
                  {(scrapedData.bedrooms || scrapedData.bathrooms) && (
                    <div>
                      <strong className="text-white/80">Details:</strong>{' '}
                      {scrapedData.bedrooms && `${scrapedData.bedrooms} bed`}
                      {scrapedData.bedrooms && scrapedData.bathrooms && ', '}
                      {scrapedData.bathrooms && `${scrapedData.bathrooms} bath`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Raw HTML Section */}
          {preview?.raw_html && (
            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <button
                onClick={() => setShowRawHtml(!showRawHtml)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    Raw HTML from ScraperAPI
                  </Typography>
                  <span className="text-xs text-white/40">
                    ({(preview.raw_html.length / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {showRawHtml ? (
                    <ChevronUp className="h-4 w-4 text-white/60" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-white/60" />
                  )}
                </div>
              </button>
              
              {showRawHtml && (
                <div className="relative">
                  <div className="absolute top-2 right-2 z-10">
                    <Button
                      onClick={handleCopyRawHtml}
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
                      {preview.raw_html}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PreviewPage() {
  return (
    <Suspense fallback={
      <div className="dark bg-[#08000d] min-h-screen flex items-center justify-center">
        <Typography variant="h2" className="text-white">
          Loading...
        </Typography>
      </div>
    }>
      <PreviewContent />
    </Suspense>
  )
}
