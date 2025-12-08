'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, ExternalLink, Code, Copy, Check, RefreshCw } from 'lucide-react'
import { getPreview, claimPreview, processApifyJson, generateConfigFromApify, processRawHtml, extractGalleryImages } from '../../actions'
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
  const [processingHtml, setProcessingHtml] = useState(false) // Track HTML processing state
  const [extractingImages, setExtractingImages] = useState(false) // Track gallery images extraction state

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

  const handleProcessRawHtml = async () => {
    if (!previewId) return
    
    setProcessingHtml(true)
    try {
      const result = await processRawHtml(previewId)
      
      if ('error' in result) {
        setError(result.error || 'Failed to process HTML')
        setProcessingHtml(false)
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
      setError('Failed to process HTML')
    } finally {
      setProcessingHtml(false)
    }
  }

  const handleExtractGalleryImages = async () => {
    if (!previewId) return
    
    setExtractingImages(true)
    try {
      const result = await extractGalleryImages(previewId)
      
      if ('error' in result) {
        setError(result.error || 'Failed to extract gallery images')
        setExtractingImages(false)
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
      setError('Failed to extract gallery images')
    } finally {
      setExtractingImages(false)
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

  // Check if this is an Apify result (structured JSON, not HTML parsing)
  const isApifyResult = preview?.source_domain?.startsWith('apify_') || 
                        preview?.ai_ready_data?.apify_json !== null ||
                        preview?.scraped_data?.provider === 'apify'

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


      {/* Gallery Images Display (if extracted) */}
      <div className="border-t border-white/10 bg-white/[0.02] py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-6">
            <Typography variant="h3" className="text-white mb-2 border-none">
              📸 Gallery Images
            </Typography>
            <Typography variant="small" className="text-white/60">
              Extracted from gallery-photo-container elements (post actions HTML)
            </Typography>
          </div>

          {preview?.ai_ready_data?.gallery_images && preview.ai_ready_data.gallery_images.length > 0 ? (

            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    Image URLs ({preview.ai_ready_data.gallery_images.length} images)
                  </Typography>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleExtractGalleryImages}
                    disabled={extractingImages}
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    {extractingImages ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Re-extract
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(preview.ai_ready_data.gallery_images, null, 2))
                      setCopiedSection('gallery-images')
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
                    {copied && copiedSection === 'gallery-images' ? (
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
              <div className="p-4 max-h-[600px] overflow-auto">
                <div className="space-y-2">
                  {preview.ai_ready_data.gallery_images.map((url: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded border border-white/10">
                      <span className="text-xs text-white/40 w-8">{index + 1}.</span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 break-all flex-1"
                      >
                        {url}
                      </a>
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(url)
                          setCopiedSection(`gallery-image-${index}`)
                          setCopied(true)
                          setTimeout(() => {
                            setCopied(false)
                            setCopiedSection(null)
                          }, 2000)
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-white/40 hover:text-white hover:bg-white/10 h-6 px-2"
                      >
                        {copied && copiedSection === `gallery-image-${index}` ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    No Gallery Images Extracted
                  </Typography>
                </div>
                <Button
                  onClick={handleExtractGalleryImages}
                  disabled={extractingImages}
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  {extractingImages ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Extract Images
                    </>
                  )}
                </Button>
              </div>
              <div className="p-4">
                <Typography variant="small" className="text-white/60">
                  Click "Extract Images" to extract gallery images from HTML (Realtor.com only)
                </Typography>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Raw Results Display */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="space-y-6">
          {/* HTML Before Actions (if website has actions) */}
          {preview?.ai_ready_data?.html_before_actions && (
            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    📸 Original HTML (Before Actions)
                  </Typography>
                  <span className="text-xs text-white/40">
                    ({(preview.ai_ready_data.html_before_actions.length / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(preview.ai_ready_data.html_before_actions)
                      setCopiedSection('html-before-actions')
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
                    {copied && copiedSection === 'html-before-actions' ? (
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
                  {preview.ai_ready_data.html_before_actions}
                </pre>
              </div>
            </div>
          )}

          {/* Processed HTML Result (if website-specific processor was used) */}
          {preview?.ai_ready_data?.processed_html && (
            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    🔧 Processed HTML (Website-Specific)
                  </Typography>
                  <span className="text-xs text-white/40">
                    ({(preview.ai_ready_data.processed_html.length / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(preview.ai_ready_data.processed_html)
                      setCopiedSection('processed')
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
                    {copied && copiedSection === 'processed' ? (
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
                  {preview.ai_ready_data.processed_html}
                </pre>
              </div>
            </div>
          )}

          {/* Raw HTML Result (HTML after actions, or normal HTML if no actions) */}
          {preview?.raw_html && (
            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    {preview?.ai_ready_data?.html_before_actions 
                      ? 'Raw HTML Result (After Actions)' 
                      : 'Raw HTML Result'}
                  </Typography>
                  <span className="text-xs text-white/40">
                    ({(preview.raw_html.length / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleProcessRawHtml}
                    disabled={processingHtml}
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    {processingHtml ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Process HTML
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
