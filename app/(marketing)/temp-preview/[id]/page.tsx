'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, ExternalLink, Code, Copy, Check, RefreshCw } from 'lucide-react'
import { getPreview, claimPreview, reprocessHtml } from '../../actions'
import { createClient } from '@/lib/supabase/client'

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
  const [copied, setCopied] = useState(false)
  const [copiedSection, setCopiedSection] = useState<string | null>(null) // Track which section was copied
  const [reprocessing, setReprocessing] = useState(false)

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
        setError(result.error || 'Failed to claim preview')
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
      setCopiedSection('raw')
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setCopiedSection(null)
      }, 2000)
    }
  }

  const handleCopyCleanedHtml = () => {
    if (preview?.cleaned_html) {
      navigator.clipboard.writeText(preview.cleaned_html)
      setCopiedSection('cleaned')
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setCopiedSection(null)
      }, 2000)
    }
  }

  const handleReprocessHtml = async () => {
    if (!preview?.raw_html || reprocessing) return
    
    setReprocessing(true)
    try {
      const result = await reprocessHtml(previewId)
      
      if ('error' in result) {
        setError(result.error || 'Failed to reprocess HTML')
        setReprocessing(false)
        return
      }
      
      // Update preview state with new cleaned_html
      setPreview({
        ...preview,
        cleaned_html: result.cleaned_html,
      })
    } catch (err) {
      setError('Failed to reprocess HTML')
    } finally {
      setReprocessing(false)
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

  // scrapedData removed - not parsing yet, only showing raw and cleaned HTML

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

      {/* Raw Results Display */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="space-y-6">
          {/* ScraperAPI Raw HTML Result */}
          {preview?.raw_html && (
            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    ScraperAPI Raw HTML Result
                  </Typography>
                  <span className="text-xs text-white/40">
                    ({(preview.raw_html.length / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleReprocessHtml}
                    disabled={reprocessing}
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    {reprocessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reprocess with Cheerio
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleCopyRawHtml}
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    {copied && copiedSection === 'raw' ? (
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
              </div>
              <div className="p-4 max-h-[600px] overflow-auto">
                <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-words">
                  {preview.raw_html}
                </pre>
              </div>
            </div>
          )}

          {/* Cheerio Cleaned HTML Result */}
          {preview?.cleaned_html && (
            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    Cheerio Cleaned HTML Result
                  </Typography>
                  <span className="text-xs text-white/40">
                    ({(preview.cleaned_html.length / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  onClick={handleCopyCleanedHtml}
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  {copied && copiedSection === 'cleaned' ? (
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
                  {preview.cleaned_html}
                </pre>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Info Footer */}
      <div className="border-t border-white/10 bg-white/[0.02] py-8">
        <div className="max-w-7xl mx-auto px-4">
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
