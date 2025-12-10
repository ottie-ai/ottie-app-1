'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { LottieSpinner } from '@/components/ui/lottie-spinner'
import { ArrowLeft, Save, ExternalLink, Code, Copy, Check, RefreshCw } from 'lucide-react'
import * as PhosphorIcons from '@phosphor-icons/react'
import { getPreview, claimPreview, processApifyJson, generateConfigFromApify, generateConfigManually, generateConfigCall1, generateTitleCall2, extractGalleryImages, removeHtmlTagsFromRawHtml } from '../../actions'
import { createClient } from '@/lib/supabase/client'
import { sortConfigToSampleOrder } from '@/lib/openai/config-sorter'

// Helper function to get Phosphor Icon component by name
function getPhosphorIcon(iconName: string) {
  if (!iconName) return null
  
  // Try to find the icon in PhosphorIcons
  const IconComponent = (PhosphorIcons as any)[iconName]
  if (IconComponent) {
    return IconComponent
  }
  
  return null
}

function PreviewContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const previewId = params.id as string
  const totalTime = searchParams.get('totalTime')
  
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRevealing, setIsRevealing] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [copiedSection, setCopiedSection] = useState<string | null>(null) // Track which section was copied
  const [copiedFullJson, setCopiedFullJson] = useState(false) // Track if full JSON was copied
  const [processingJson, setProcessingJson] = useState(false) // Track JSON processing state
  const [generatingConfig, setGeneratingConfig] = useState(false) // Track OpenAI config generation (Call 1)
  const [generatingTitle, setGeneratingTitle] = useState(false) // Track OpenAI title generation (Call 2)
  const [extractingImages, setExtractingImages] = useState(false) // Track gallery images extraction state
  const [removingHtmlTags, setRemovingHtmlTags] = useState(false) // Track HTML tags removal state

  // Format milliseconds to readable time
  const formatTime = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`
    }
    return `${(ms / 1000).toFixed(2)}s`
  }

  // Calculate generation time for Call 1 (base config generation)
  // Uses call1_duration_ms from metadata (pure OpenAI call time, no local operations)
  const getCall1Time = (): string | null => {
    if (!preview?.generated_config || Object.keys(preview.generated_config).length === 0) return null
    
    const metadata = preview.generated_config._metadata
    if (metadata?.call1_duration_ms !== undefined) {
      return formatTime(metadata.call1_duration_ms)
    }
    
    return null
  }

  // Calculate generation time for Call 2 (title and highlights improvement)
  // Uses call2_duration_ms from metadata (pure OpenAI call time, no local operations)
  const getCall2Time = (): string | null => {
    if (!preview?.unified_json || Object.keys(preview.unified_json).length === 0) return null
    if (!preview?.generated_config || Object.keys(preview.generated_config).length === 0) return null
    
    // Check if unified_json has different title/highlights than generated_config (meaning Call 2 ran)
    const hasCall2Data = 
      preview.unified_json?.title !== preview.generated_config?.title ||
      JSON.stringify(preview.unified_json?.highlights) !== JSON.stringify(preview.generated_config?.highlights)
    
    if (!hasCall2Data) return null
    
    const metadata = preview.unified_json._metadata
    if (metadata?.call2_duration_ms !== undefined) {
      return formatTime(metadata.call2_duration_ms)
    }
    
    return null
  }

  // Legacy function for other steps (kept for backward compatibility)
  const getGenerationTime = (hasData: boolean): string | null => {
    if (!hasData || !preview?.created_at) return null
    
    // Use updated_at if available, otherwise use current time as fallback
    const endTime = preview?.updated_at ? new Date(preview.updated_at).getTime() : Date.now()
    const startTime = new Date(preview.created_at).getTime()
    const diff = endTime - startTime
    
    if (diff < 0) return null
    return formatTime(diff)
  }

  // Load preview with smooth reveal
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
        
        // Start reveal animation
        setIsRevealing(true)
        
        // After a short delay, hide loading and show content
        setTimeout(() => {
          setLoading(false)
        }, 600) // Match animation duration
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
    const rawHtml = preview?.default_raw_html || preview?.raw_html
    if (rawHtml) {
      navigator.clipboard.writeText(rawHtml)
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
      // Call 1: Generate base config
      const result = await generateConfigCall1(previewId)
      
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

  const handleGenerateTitle = async () => {
    if (!previewId) return
    
    setGeneratingTitle(true)
    try {
      // Call 2: Generate improved title and highlights
      const result = await generateTitleCall2(previewId)
      
      if ('error' in result) {
        setError(result.error || 'Failed to generate title and highlights')
        setGeneratingTitle(false)
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
      setError('Failed to generate title and highlights')
    } finally {
      setGeneratingTitle(false)
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

  const handleRemoveHtmlTags = async () => {
    if (!previewId) return
    
    setRemovingHtmlTags(true)
    try {
      const result = await removeHtmlTagsFromRawHtml(previewId)
      
      if ('error' in result) {
        setError(result.error || 'Failed to remove HTML tags')
        setRemovingHtmlTags(false)
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
      setError('Failed to remove HTML tags')
    } finally {
      setRemovingHtmlTags(false)
    }
  }



  if (loading) {
    return (
      <div className={`dark bg-[#08000d] min-h-screen flex items-center justify-center transition-opacity duration-[600ms] ${isRevealing ? 'opacity-0' : 'opacity-100'}`}>
        <LottieSpinner size={32} />
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
                        !!preview?.generated_config?.apify_json ||
                        !!preview?.unified_json?.apify_json ||
                        preview?.scraped_data?.provider === 'apify'

  return (
    <div className={`dark bg-[#08000d] min-h-screen transition-opacity duration-[600ms] ${isRevealing ? 'opacity-100' : 'opacity-0'}`}>
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

      {/* OpenAI Calls Display */}
      <div className="border-t border-white/10 bg-white/[0.02] py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-6">
            <Typography variant="h3" className="text-white mb-2 border-none">
              ✨ OpenAI Generation
            </Typography>
            <Typography variant="small" className="text-white/60">
              Two-step process: First generate base config, then improve title and highlights
            </Typography>
          </div>

          <div className="space-y-6">
            {/* Call 1: Base Config */}
            <div>
              <div className="mb-3">
                <Typography variant="h4" className="text-white mb-1 border-none">
                  Call 1: Base Config Generation
                </Typography>
                <Typography variant="small" className="text-white/60">
                  Generates JSON config from property data (temperature: 0.3)
                </Typography>
              </div>

              {preview?.generated_config && Object.keys(preview.generated_config).length > 0 ? (
                <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-white/60" />
                      <Typography variant="small" className="text-white/80 font-medium">
                        Generated Config (Call 1)
                      </Typography>
                      <span className="text-xs text-white/40">
                        ({(JSON.stringify(preview.generated_config).length / 1024).toFixed(1)} KB)
                      </span>
                      {preview?.generated_config && Object.keys(preview.generated_config).length > 0 && (
                        <>
                          <span className="text-xs text-white/50 ml-2">
                            • {getCall1Time() || 'N/A'}
                          </span>
                          {preview.generated_config._metadata?.call1_usage && (
                            <span className="text-xs text-white/40 ml-2">
                              • {preview.generated_config._metadata.call1_usage.prompt_tokens} prompt + {preview.generated_config._metadata.call1_usage.completion_tokens} completion = {preview.generated_config._metadata.call1_usage.total_tokens} tokens
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
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
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate
                          </>
                        )}
                      </Button>
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
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {/* OpenAI Usage Info */}
                    {preview.generated_config._metadata?.call1_usage && (
                      <div className="mb-4 p-3 bg-white/[0.05] rounded border border-white/10">
                        <Typography variant="small" className="text-white/60 mb-2">
                          OpenAI Usage (Call 1):
                        </Typography>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-white/40">Prompt:</span>
                            <span className="text-white/70 ml-1 font-mono">{preview.generated_config._metadata.call1_usage.prompt_tokens.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-white/40">Completion:</span>
                            <span className="text-white/70 ml-1 font-mono">{preview.generated_config._metadata.call1_usage.completion_tokens.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-white/40">Total:</span>
                            <span className="text-white/70 ml-1 font-mono">{preview.generated_config._metadata.call1_usage.total_tokens.toLocaleString()}</span>
                          </div>
                        </div>
                        {preview.generated_config._metadata?.call1_duration_ms && (
                          <div className="mt-2 text-xs text-white/40">
                            Call duration: {getCall1Time()}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="max-h-[400px] overflow-auto">
                      <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-words">
                        {JSON.stringify(sortConfigToSampleOrder(
                          (() => {
                            const { _metadata, ...config } = preview.generated_config
                            return config
                          })()
                        ), null, 2)}
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
                          Generate Config (Call 1)
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="p-4">
                    <Typography variant="small" className="text-white/60">
                      {isApifyResult
                        ? 'Click to generate base config from Apify data'
                        : 'Click to generate base config from markdown'}
                    </Typography>
                  </div>
                </div>
              )}
            </div>

            {/* Call 2: Title & Highlights */}
            <div>
              <div className="mb-3">
                <Typography variant="h4" className="text-white mb-1 border-none">
                  Call 2: Title & Highlights Improvement
                </Typography>
                <Typography variant="small" className="text-white/60">
                  Improves title and highlights using base config (temperature: 0.8)
                </Typography>
              </div>

              {preview?.unified_json && Object.keys(preview.unified_json).length > 0 ? (
                <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-white/60" />
                      <Typography variant="small" className="text-white/80 font-medium">
                        Title & Highlights (Call 2)
                      </Typography>
                      {preview?.unified_json && Object.keys(preview.unified_json).length > 0 && (
                        <>
                          <span className="text-xs text-white/50 ml-2">
                            • {getCall2Time() || 'N/A'}
                          </span>
                          {preview.unified_json._metadata?.call2_usage && (
                            <span className="text-xs text-white/40 ml-2">
                              • {preview.unified_json._metadata.call2_usage.prompt_tokens} prompt + {preview.unified_json._metadata.call2_usage.completion_tokens} completion = {preview.unified_json._metadata.call2_usage.total_tokens} tokens
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleGenerateTitle}
                        disabled={generatingTitle || !preview?.generated_config || Object.keys(preview.generated_config).length === 0}
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:text-white hover:bg-white/10"
                      >
                        {generatingTitle ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          const titleAndHighlights = {
                            title: preview.unified_json?.title || '',
                            highlights: preview.unified_json?.highlights || []
                          }
                          navigator.clipboard.writeText(JSON.stringify(titleAndHighlights, null, 2))
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
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {/* OpenAI Usage Info */}
                    {preview.unified_json._metadata?.call2_usage && (
                      <div className="mb-4 p-3 bg-white/[0.05] rounded border border-white/10">
                        <Typography variant="small" className="text-white/60 mb-2">
                          OpenAI Usage (Call 2):
                        </Typography>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-white/40">Prompt:</span>
                            <span className="text-white/70 ml-1 font-mono">{preview.unified_json._metadata.call2_usage.prompt_tokens.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-white/40">Completion:</span>
                            <span className="text-white/70 ml-1 font-mono">{preview.unified_json._metadata.call2_usage.completion_tokens.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-white/40">Total:</span>
                            <span className="text-white/70 ml-1 font-mono">{preview.unified_json._metadata.call2_usage.total_tokens.toLocaleString()}</span>
                          </div>
                        </div>
                        {preview.unified_json._metadata?.call2_duration_ms && (
                          <div className="mt-2 text-xs text-white/40">
                            Call duration: {getCall2Time()}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      {/* Title */}
                      <div>
                        <Typography variant="small" className="text-white/60 mb-2">
                          Title:
                        </Typography>
                        <div className="p-3 bg-white/[0.05] rounded border border-white/10">
                          <Typography variant="p" className="text-white">
                            {preview.unified_json?.title || 'No title generated'}
                          </Typography>
                        </div>
                      </div>

                      {/* Highlights */}
                      <div>
                        <Typography variant="small" className="text-white/60 mb-3">
                          Highlights ({preview.unified_json?.highlights?.length || 0}):
                        </Typography>
                        <div className="space-y-3">
                          {preview.unified_json?.highlights && preview.unified_json.highlights.length > 0 ? (
                            preview.unified_json.highlights.map((highlight: any, index: number) => {
                              const IconComponent = highlight.icon ? getPhosphorIcon(highlight.icon) : null
                              return (
                                <div key={index} className="p-4 bg-white/[0.05] rounded-lg border border-white/10 hover:bg-white/[0.08] transition-colors">
                                  <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                      {IconComponent ? (
                                        <IconComponent className="h-5 w-5 text-white/80" weight="light" />
                                      ) : (
                                        <span className="text-sm font-medium text-white/80">{index + 1}</span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="mb-2">
                                        <Typography variant="small" className="text-white font-semibold text-base leading-tight">
                                          {highlight.title || 'No title'}
                                        </Typography>
                                      </div>
                                      <div className="mb-2">
                                        <Typography variant="small" className="text-white/70 text-sm leading-relaxed">
                                          {highlight.value || 'No value'}
                                        </Typography>
                                      </div>
                                      {highlight.icon && !IconComponent && (
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded border border-white/10">
                                          <Code className="h-3 w-3 text-white/50" />
                                          <Typography variant="small" className="text-white/50 text-xs font-mono">
                                            {highlight.icon}
                                          </Typography>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          ) : (
                            <div className="p-4 bg-white/[0.05] rounded-lg border border-white/10">
                              <Typography variant="small" className="text-white/60">
                                No highlights generated
                              </Typography>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-white/60" />
                      <Typography variant="small" className="text-white/80 font-medium">
                        Title & Highlights Not Generated Yet
                      </Typography>
                    </div>
                    <Button
                      onClick={handleGenerateTitle}
                      disabled={generatingTitle || !preview?.generated_config || Object.keys(preview.generated_config).length === 0}
                      variant="ghost"
                      size="sm"
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      {generatingTitle ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Generate Title & Highlights (Call 2)
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="p-4">
                    <Typography variant="small" className="text-white/60">
                      {!preview?.generated_config || Object.keys(preview.generated_config).length === 0
                        ? 'Please run Call 1 first to generate base config'
                        : 'Click to improve title and highlights from base config'}
                    </Typography>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Processing Steps Display */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-6">
          <Typography variant="h3" className="text-white mb-2 border-none">
            🔄 Processing Steps
          </Typography>
          <Typography variant="small" className="text-white/60">
            Each step can be manually triggered for debugging purposes
          </Typography>
        </div>

        <div className="space-y-6">
          {/* Step 1: Raw HTML (from Firecrawl call) */}
          {(preview?.default_raw_html || preview?.raw_html) && (
            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    Step 1: Raw HTML (from Firecrawl)
                  </Typography>
                  <span className="text-xs text-white/40">
                    ({(((preview.default_raw_html || preview.raw_html)?.length || 0) / 1024).toFixed(1)} KB)
                  </span>
                  {(preview?.default_raw_html || preview?.raw_html) && (
                    <span className="text-xs text-white/50 ml-2">
                      • {getGenerationTime(true) || 'N/A'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleRemoveHtmlTags}
                    disabled={removingHtmlTags}
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    {removingHtmlTags ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Code className="h-4 w-4 mr-2" />
                        Remove Tags
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
                  {preview.default_raw_html || preview.raw_html}
                </pre>
              </div>
            </div>
          )}

          {/* Step 2: Gallery HTML (from Call 2) */}
          {preview?.gallery_raw_html && (
            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    Step 2: Gallery HTML (from Firecrawl Call 2)
                  </Typography>
                  <span className="text-xs text-white/40">
                    ({(preview.gallery_raw_html.length / 1024).toFixed(1)} KB)
                  </span>
                  {preview?.gallery_raw_html && (
                    <span className="text-xs text-white/50 ml-2">
                      • {getGenerationTime(true) || 'N/A'}
                    </span>
                  )}
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
                        <Code className="h-4 w-4 mr-2" />
                        Extract Gallery
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(preview.gallery_raw_html)
                      setCopiedSection('gallery-html')
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
                    {copied && copiedSection === 'gallery-html' ? (
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
                  {preview.gallery_raw_html}
                </pre>
              </div>
            </div>
          )}

          {/* Markdown / Structured Text (if available) */}
          {preview?.default_markdown && (
            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    Markdown / Structured Text
                  </Typography>
                  <span className="text-xs text-white/40">
                    ({(preview.default_markdown.length / 1024).toFixed(1)} KB)
                  </span>
                  {preview?.default_markdown && (
                    <span className="text-xs text-white/50 ml-2">
                      • {getGenerationTime(true) || 'N/A'}
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(preview.default_markdown)
                    setCopiedSection('raw-text')
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
                  {copied && copiedSection === 'raw-text' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Text
                    </>
                  )}
                </Button>
              </div>
              <div className="p-4 max-h-[600px] overflow-auto">
                <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-words">
                  {preview.default_markdown}
                </pre>
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

          {preview?.gallery_image_urls && preview.gallery_image_urls.length > 0 ? (

            <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-white/60" />
                  <Typography variant="small" className="text-white/80 font-medium">
                    Image URLs ({preview.gallery_image_urls.length} images)
                  </Typography>
                  {preview?.gallery_image_urls && preview.gallery_image_urls.length > 0 && (
                    <span className="text-xs text-white/50 ml-2">
                      • {getGenerationTime(true) || 'N/A'}
                    </span>
                  )}
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
                      navigator.clipboard.writeText(JSON.stringify(preview.gallery_image_urls, null, 2))
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
                  {preview.gallery_image_urls.map((url: string, index: number) => (
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
        <div className="flex flex-col items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8">
            <LottieSpinner size={32} />
          </div>
          <Typography variant="h2" className="text-white">
            Assembling your website
          </Typography>
        </div>
      </div>
    }>
      <PreviewContent />
    </Suspense>
  )
}
