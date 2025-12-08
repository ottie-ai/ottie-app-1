'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, ExternalLink, Code, Copy, Check, RefreshCw } from 'lucide-react'
import { getPreview, claimPreview, processApifyJson, generateConfigFromApify } from '../../actions'
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
  const [copiedFullJson, setCopiedFullJson] = useState(false) // Track if full JSON was copied
  const [processingJson, setProcessingJson] = useState(false) // Track JSON processing state
  const [generatingConfig, setGeneratingConfig] = useState(false) // Track OpenAI config generation

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


  const handleCopyMarkdown = () => {
    if (preview?.markdown) {
      navigator.clipboard.writeText(preview.markdown)
      setCopiedSection('markdown')
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setCopiedSection(null)
      }, 2000)
    }
  }

  const handleCopyStructuredData = () => {
    const structuredData = preview?.ai_ready_data?.structuredData || preview?.scraped_data?.structuredData
    if (structuredData) {
      navigator.clipboard.writeText(JSON.stringify(structuredData, null, 2))
      setCopiedSection('structured')
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setCopiedSection(null)
      }, 2000)
    }
  }

  const handleProcessApifyJson = async () => {
    if (!previewId) return
    
    setProcessingJson(true)
    try {
      const result = await processApifyJson(previewId)
      
      if ('error' in result) {
        setError(result.error || 'Failed to process JSON')
        setProcessingJson(false)
        return
      }
      
      // Reload preview to show updated data
      const reloadResult = await getPreview(previewId)
      if ('error' in reloadResult) {
        setError(reloadResult.error || 'Failed to reload preview')
      } else {
        setPreview(reloadResult.preview)
      }
    } catch (err) {
      setError('Failed to process JSON')
    } finally {
      setProcessingJson(false)
    }
  }

  const handleGenerateConfig = async () => {
    if (!previewId) return
    
    setGeneratingConfig(true)
    try {
      const result = await generateConfigFromApify(previewId)
      
      if ('error' in result) {
        setError(result.error || 'Failed to generate config')
        setGeneratingConfig(false)
        return
      }
      
      // Reload preview to show updated data
      const reloadResult = await getPreview(previewId)
      if ('error' in reloadResult) {
        setError(reloadResult.error || 'Failed to reload preview')
      } else {
        setPreview(reloadResult.preview)
      }
    } catch (err) {
      setError('Failed to generate config')
    } finally {
      setGeneratingConfig(false)
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

  // Helper for backward compatibility - use new schema with fallback to old
  const structuredData = preview?.ai_ready_data?.structuredData || preview?.scraped_data?.structuredData
  const readabilityMetadata = preview?.ai_ready_data?.readabilityMetadata || preview?.scraped_data?.readabilityMetadata
  
  // Check if this is an Apify result (structured JSON, not HTML parsing)
  const isApifyResult = preview?.source_domain?.startsWith('apify_') || 
                        preview?.ai_ready_data?.apify_json !== null ||
                        preview?.scraped_data?.provider === 'apify'
  
  // Check if this is a Firecrawl result with direct markdown
  const isFirecrawlResult = preview?.source_domain === 'firecrawl'
  const firecrawlMarkdown = preview?.ai_ready_data?.firecrawlMarkdown
  const convertedMarkdown = preview?.markdown || preview?.ai_ready_data?.markdown

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

      {/* Generated Config Display (OpenAI Result) */}
      <div className="border-t border-white/10 bg-white/[0.02] py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-6">
            <Typography variant="h3" className="text-white mb-2 border-none">
              ✨ Generated Site Config (OpenAI)
            </Typography>
            <Typography variant="small" className="text-white/60">
              {preview?.generated_config && Object.keys(preview.generated_config).length > 0
                ? 'AI-generated configuration ready for site building'
                : 'AI-generated configuration will appear here after processing'}
            </Typography>
          </div>

          {preview?.generated_config && Object.keys(preview.generated_config).length > 0 ? (

            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    Generated Config (Step 3)
                  </Typography>
                  <span className="text-xs text-white/40">
                    ({(JSON.stringify(preview.generated_config).length / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(preview.generated_config, null, 2))
                    setCopiedFullJson(true)
                    setTimeout(() => {
                      setCopiedFullJson(false)
                    }, 2000)
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  {copiedFullJson ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy JSON
                    </>
                  )}
                </Button>
              </div>
              
              <div className="p-4">
                <div className="max-h-[600px] overflow-auto">
                  <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(preview.generated_config, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    Config Not Generated Yet
                  </Typography>
                </div>
                {isApifyResult && (
                  <Button
                    onClick={handleGenerateConfig}
                    disabled={generatingConfig}
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    {generatingConfig ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generate Config
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="p-4">
                <Typography variant="small" className="text-white/60">
                  {isApifyResult
                    ? 'Click "Generate Config" to process Apify data with OpenAI'
                    : 'Config generation is only available for Apify results'}
                </Typography>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Extracted Structured Data Display */}
      {structuredData && (
        <div className="border-t border-white/10 bg-white/[0.02] py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="mb-6">
              <Typography variant="h3" className="text-white mb-2 border-none">
                📊 Extracted Structured Data
              </Typography>
              <Typography variant="small" className="text-white/60">
                JSON blobs and meta tags extracted before HTML cleaning (JSON-LD, __NEXT_DATA__, OpenGraph, etc.)
              </Typography>
            </div>

            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    Structured Data (Step 2)
                  </Typography>
                  <span className="text-xs text-white/40">
                    ({(JSON.stringify(structuredData).length / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isApifyResult && (
                    <Button
                      onClick={handleProcessApifyJson}
                      disabled={processingJson}
                      variant="ghost"
                      size="sm"
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      {processingJson ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Clean JSON
                        </>
                      )}
                    </Button>
                  )}
                <Button
                  onClick={handleCopyStructuredData}
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  {copied && copiedSection === 'structured' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy JSON
                    </>
                  )}
                </Button>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Summary Stats - Only show for non-Apify results (HTML parsing) */}
                {!isApifyResult && (
                  <>
                    {/* Summary Stats - Row 1: Core JSON Data */}
                    <div>
                      <Typography variant="small" className="text-white/60 mb-2">Core Structured Data</Typography>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">JSON-LD</div>
                          <div className="text-lg font-semibold text-white">
                            {structuredData.jsonLd?.length || 0}
                          </div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">Microdata</div>
                          <div className="text-lg font-semibold text-white">
                            {structuredData.microdata?.length || 0}
                          </div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">DataLayer (GTM)</div>
                          <div className="text-lg font-semibold text-white">
                            {structuredData.dataLayer?.length || 0}
                          </div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">Data Attributes</div>
                          <div className="text-lg font-semibold text-white">
                            {structuredData.dataAttributes?.length || 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Stats - Row 2: Framework Hydration */}
                    <div>
                      <Typography variant="small" className="text-white/60 mb-2">Framework Hydration States</Typography>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">__NEXT_DATA__</div>
                          <div className="text-lg font-semibold text-white">
                            {structuredData.nextData ? '✓' : '✗'}
                          </div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">__NUXT__</div>
                          <div className="text-lg font-semibold text-white">
                            {structuredData.nuxtData ? '✓' : '✗'}
                          </div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">INITIAL_STATE</div>
                          <div className="text-lg font-semibold text-white">
                            {structuredData.initialState ? '✓' : '✗'}
                          </div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">Window States</div>
                          <div className="text-lg font-semibold text-white">
                            {Object.keys(structuredData.windowStates || {}).length}
                          </div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">Comments JSON</div>
                          <div className="text-lg font-semibold text-white">
                            {structuredData.comments?.length || 0}
                          </div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">Noscript</div>
                          <div className="text-lg font-semibold text-white">
                            {structuredData.noscriptContent?.length || 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Stats - Row 3: Meta Tags */}
                    <div>
                      <Typography variant="small" className="text-white/60 mb-2">Meta Tags</Typography>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">OpenGraph</div>
                          <div className="text-lg font-semibold text-white">
                            {Object.keys(structuredData.openGraph || {}).length}
                          </div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">Extended Meta</div>
                          <div className="text-lg font-semibold text-white">
                            {Object.keys(structuredData.extendedMeta || {}).length}
                          </div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">Total Sources</div>
                          <div className="text-lg font-semibold text-green-400">
                            {(structuredData.jsonLd?.length || 0) + 
                             (structuredData.microdata?.length || 0) + 
                             (structuredData.dataLayer?.length || 0) + 
                             (structuredData.nextData ? 1 : 0) + 
                             Object.keys(structuredData.windowStates || {}).length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Readability Metadata (if available) */}
                {readabilityMetadata && (
                  <div className="border-t border-white/10 pt-4">
                    <Typography variant="small" className="text-white/80 font-medium mb-3">
                      📖 Mozilla Readability Metadata
                    </Typography>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {readabilityMetadata.title && (
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">Title</div>
                          <div className="text-sm text-white/90">
                            {readabilityMetadata.title}
                          </div>
                        </div>
                      )}
                      {readabilityMetadata.excerpt && (
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">Excerpt</div>
                          <div className="text-sm text-white/90">
                            {readabilityMetadata.excerpt}
                          </div>
                        </div>
                      )}
                      {readabilityMetadata.length > 0 && (
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">Content Length</div>
                          <div className="text-sm text-white/90">
                            {readabilityMetadata.length.toLocaleString()} characters
                          </div>
                        </div>
                      )}
                      {readabilityMetadata.siteName && (
                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
                          <div className="text-xs text-white/40 mb-1">Site Name</div>
                          <div className="text-sm text-white/90">
                            {readabilityMetadata.siteName}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Full JSON Display */}
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Typography variant="small" className="text-white/80 font-medium">
                      🔍 Full Structured Data (JSON)
                    </Typography>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(structuredData, null, 2))
                        setCopiedFullJson(true)
                        setTimeout(() => {
                          setCopiedFullJson(false)
                        }, 2000)
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      {copiedFullJson ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy JSON
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="max-h-[600px] overflow-auto">
                    <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-words">
                      {JSON.stringify(structuredData, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raw Results Display */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="space-y-6">
          {/* Raw HTML Result (all providers return raw HTML) */}
          {preview?.raw_html && (
            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    Raw HTML Result
                  </Typography>
                  <span className="text-xs text-white/40">
                    ({(preview.raw_html.length / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center gap-2">
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

          {/* Firecrawl Markdown Result (Direct from API) */}
          {isFirecrawlResult && firecrawlMarkdown && (
            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    🔥 Firecrawl Markdown (Direct from API)
                  </Typography>
                  <span className="text-xs text-white/40">
                    ({(firecrawlMarkdown.length / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(firecrawlMarkdown)
                    setCopiedSection('firecrawl-markdown')
                    setCopied(true)
                    setTimeout(() => {
                      setCopied(false)
                      setCopiedSection(null)
                    }, 2000)
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  {copied && copiedSection === 'firecrawl-markdown' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Markdown
                    </>
                  )}
                </Button>
              </div>
              <div className="p-4 max-h-[600px] overflow-auto">
                <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-words">
                  {firecrawlMarkdown}
                </pre>
              </div>
            </div>
          )}

          {/* Converted Markdown Result (Mozilla Readability or other conversion) */}
          {convertedMarkdown && (!isFirecrawlResult || !firecrawlMarkdown || convertedMarkdown !== firecrawlMarkdown) && (
            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    📖 Converted Markdown {isFirecrawlResult ? '(Mozilla Readability)' : '(Mozilla Readability)'}
                  </Typography>
                  <span className="text-xs text-white/40">
                    ({(convertedMarkdown.length / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  onClick={handleCopyMarkdown}
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  {copied && copiedSection === 'markdown' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Markdown
                    </>
                  )}
                </Button>
              </div>
              <div className="p-4 max-h-[600px] overflow-auto">
                <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-words">
                  {convertedMarkdown}
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
              href={preview.external_url || preview.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white inline-flex items-center gap-2"
            >
              {preview.external_url || preview.source_url}
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
