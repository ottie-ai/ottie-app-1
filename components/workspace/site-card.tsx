'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  MoreHorizontal, 
  Eye,
  Check,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { toastSuccess } from '@/lib/toast-helpers'
import { handleArchiveSite, handleUnarchiveSite, handleDuplicateSite, handleDeleteSite, handleReassignSite } from '@/app/actions/site-actions'
import { LottiePhotoIcon } from '@/components/ui/lottie-photo-icon'
import { LottieAnalyticsIcon } from '@/components/ui/lottie-analytics-icon'
import { LottieEditIcon } from '@/components/ui/lottie-edit-icon'
import { LottieBookIcon } from '@/components/ui/lottie-book-icon'
import { LottieAccountIcon } from '@/components/ui/lottie-account-icon'
import { LottieCopyIcon } from '@/components/ui/lottie-copy-icon'
import { LottieTrashIcon } from '@/components/ui/lottie-trash-icon'
import { LottieInboxIcon } from '@/components/ui/lottie-inbox-icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface SiteCardData {
  id: string
  title: string
  slug: string
  status: 'published' | 'draft' | 'archived'
  availability?: 'available' | 'under_offer' | 'reserved' | 'sold' | 'off_market'
  views?: number
  lastEdited?: string
  thumbnail: string | null
  avatar?: string | null
  avatarFallback?: string
  domain?: string // Domain where site is hosted (default: 'ottie.site', can be custom domain)
  assigned_agent_id?: string | null // ID of assigned agent
}

interface SiteCardProps {
  site: SiteCardData
  href?: string
  onStatusChange?: () => void // Callback when site status changes
  members?: Array<{ membership: { user_id: string }; profile: { avatar_url: string | null; full_name: string | null; email: string | null } }> // Workspace members for reassign
}

export function SiteCard({ site, href = `/builder/${site.id}`, onStatusChange, members = [] }: SiteCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSlugHovered, setIsSlugHovered] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isUnarchiving, setIsUnarchiving] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isReassigning, setIsReassigning] = useState(false)
  const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false)

  // Helper function to handle unassign
  const handleUnassignSite = async (agentId: string | null) => {
    if (isReassigning) return
    
    setIsReassigning(true)
    const result = await handleReassignSite(site.id, agentId)
    setIsReassigning(false)
    setIsMenuOpen(false)
    
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toastSuccess('Site reassigned successfully')
      onStatusChange?.()
    }
  }

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Use domain - if it's not 'ottie.site', it's a custom domain
    const fullUrl = site.domain && site.domain !== 'ottie.site'
      ? `https://${site.domain}`
      : `https://${site.slug}.ottie.site`
    
    try {
      await navigator.clipboard.writeText(fullUrl)
      setIsCopied(true)
      toastSuccess('URL copied to clipboard', {
        description: fullUrl,
      })
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
      toast.error('Failed to copy URL')
    }
  }

  return (
    <div className="group">
      {/* Card with Thumbnail */}
      <Link href={href}>
        <div className="relative aspect-[4/3] bg-muted rounded-2xl overflow-hidden">
          {site.thumbnail ? (
            <img 
              src={site.thumbnail} 
              alt={site.title}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-accent dark:bg-[#1a1a1a]">
              <LottiePhotoIcon className="text-muted-foreground" size={24} />
            </div>
          )}
          {/* Avatar in top left corner */}
          <div className="absolute top-3 left-3 z-10">
            <div className="size-12 rounded-full p-[2px] bg-background">
              <Avatar className="size-full">
                <AvatarImage src={site.avatar || undefined} alt={site.title} />
                <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                  {site.avatarFallback || site.title.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          {/* Views and Availability in bottom right corner */}
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
            {site.availability && (() => {
              const getAvailabilityBadgeClass = (availability: string) => {
                switch (availability) {
                  case 'available':
                    return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/15'
                  case 'under_offer':
                    return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/15'
                  case 'reserved':
                    return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/15'
                  case 'sold':
                    return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/15'
                  case 'off_market':
                    return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/15'
                  default:
                    return 'bg-muted text-muted-foreground border-border'
                }
              }
              
              const getAvailabilityLabel = (availability: string) => {
                switch (availability) {
                  case 'under_offer':
                    return 'Under offer'
                  case 'off_market':
                    return 'Off market'
                  default:
                    return availability.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                }
              }
              
              return (
                <Badge className={getAvailabilityBadgeClass(site.availability)}>
                  {getAvailabilityLabel(site.availability)}
                </Badge>
              )
            })()}
            {site.views !== undefined && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border/50">
                <Eye className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{site.views.toLocaleString()}</span>
              </div>
            )}
          </div>
          
          {/* Menu Button - appears on hover */}
          <div 
            className={`absolute top-3 right-3 transition-opacity ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onClick={(e) => e.preventDefault()}
          >
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="size-9 rounded-xl bg-muted/90 backdrop-blur-sm hover:bg-muted"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <LottieAnalyticsIcon className="size-4 mr-2" />
                  Analytics
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LottieEditIcon className="size-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <LottieBookIcon className="size-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <LottieAccountIcon className="size-4 mr-2" />
                    Reassign
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (isReassigning || site.assigned_agent_id === null) return
                        
                        // If site is published, show warning dialog
                        if (site.status === 'published') {
                          setIsUnassignDialogOpen(true)
                          setIsMenuOpen(false)
                        } else {
                          // If not published, directly unassign
                          handleUnassignSite(null)
                        }
                      }}
                      disabled={isReassigning || site.assigned_agent_id === null}
                    >
                      <span className="text-muted-foreground">Unassigned</span>
                    </DropdownMenuItem>
                    {members.length > 0 && <DropdownMenuSeparator />}
                    {members.map((member) => (
                      <DropdownMenuItem
                        key={member.membership.user_id}
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (isReassigning || site.assigned_agent_id === member.membership.user_id) return
                          
                          // If site is published and we're changing from one agent to another, no warning needed
                          // Only warn if unassigning (setting to null)
                          handleUnassignSite(member.membership.user_id)
                        }}
                        disabled={isReassigning || site.assigned_agent_id === member.membership.user_id}
                        className="flex items-center gap-2"
                      >
                        <Avatar className="size-5">
                          <AvatarImage src={member.profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {member.profile.full_name 
                              ? member.profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                              : member.profile.email?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.profile.full_name || member.profile.email || 'Unknown'}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                {site.status === 'archived' ? (
                  <DropdownMenuItem
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (isUnarchiving) return
                      
                      setIsUnarchiving(true)
                      const result = await handleUnarchiveSite(site.id)
                      setIsUnarchiving(false)
                      setIsMenuOpen(false)
                      
                      if ('error' in result) {
                        toast.error(result.error)
                      } else {
                        toastSuccess('Site unarchived successfully')
                        // Trigger refresh of sites list
                        onStatusChange?.()
                      }
                    }}
                    disabled={isUnarchiving}
                  >
                    <LottieInboxIcon className="size-4 mr-2" />
                    Unarchive
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (isArchiving) return
                      
                      setIsArchiving(true)
                      const result = await handleArchiveSite(site.id)
                      setIsArchiving(false)
                      setIsMenuOpen(false)
                      
                      if ('error' in result) {
                        toast.error(result.error)
                      } else {
                        toastSuccess('Site archived successfully')
                        // Trigger refresh of sites list
                        onStatusChange?.()
                      }
                    }}
                    disabled={isArchiving}
                  >
                    <LottieInboxIcon className="size-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (isDuplicating) return
                    
                    setIsDuplicating(true)
                    const result = await handleDuplicateSite(site.id)
                    setIsDuplicating(false)
                    setIsMenuOpen(false)
                    
                    if ('error' in result) {
                      toast.error(result.error)
                    } else {
                      toastSuccess('Site duplicated successfully')
                      onStatusChange?.()
                    }
                  }}
                  disabled={isDuplicating}
                >
                  <LottiePhotoIcon className="size-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  variant="destructive"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('🟡 [SiteCard] Delete menu item clicked, opening dialog')
                    setIsDeleteDialogOpen(true)
                    setIsMenuOpen(false)
                  }}
                >
                  <LottieTrashIcon className="size-4 mr-2" destructive={true} />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Link>

      {/* Info below card */}
      <div className="pt-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">{site.title}</h3>
          <div 
            className="relative flex items-center gap-1.5 group/slug"
            onMouseEnter={() => setIsSlugHovered(true)}
            onMouseLeave={() => setIsSlugHovered(false)}
          >
            <p className="text-xs text-muted-foreground font-mono truncate">
              {site.slug}
            </p>
            <button
              onClick={handleCopyUrl}
              className={`flex-shrink-0 p-1 rounded-md transition-all ${
                isSlugHovered || isCopied
                  ? 'opacity-100 translate-x-0 pointer-events-auto'
                  : 'opacity-0 -translate-x-2 pointer-events-none'
              } hover:bg-muted active:scale-95`}
              title="Copy site URL"
            >
              <div className="w-3 h-3 flex items-center justify-center flex-shrink-0">
                {isCopied ? (
                  <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                ) : (
                  <LottieCopyIcon className="size-3" />
                )}
              </div>
            </button>
          </div>
        </div>
        <Badge 
          variant="secondary" 
          className={`shrink-0 capitalize ${
            site.status === 'published' 
              ? 'gradient-ottie hover:opacity-90 text-white border-0' 
              : site.status === 'archived'
              ? 'bg-muted/50 text-muted-foreground/60 border-muted-foreground/20'
              : ''
          }`}
        >
          {site.status === 'published' ? 'Published' : site.status === 'archived' ? 'Archived' : 'Draft'}
        </Badge>
      </div>

      {/* Unassign Warning Dialog */}
      <AlertDialog open={isUnassignDialogOpen} onOpenChange={setIsUnassignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign Site</AlertDialogTitle>
            <AlertDialogDescription>
              This site is currently published. If you unassign it, the listing will be changed to draft status and will no longer be publicly accessible. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReassigning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault()
                if (isReassigning) return
                
                setIsReassigning(true)
                const result = await handleReassignSite(site.id, null)
                setIsReassigning(false)
                setIsUnassignDialogOpen(false)
                
                if ('error' in result) {
                  toast.error(result.error)
                } else {
                  toastSuccess('Site unassigned and changed to draft')
                  onStatusChange?.()
                }
              }}
              disabled={isReassigning}
            >
              {isReassigning ? 'Unassigning...' : 'Unassign & Change to Draft'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{site.title}"? This action cannot be undone. The site will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault()
                console.log('🟢 [SiteCard] Delete button clicked for site:', site.id)
                if (isDeleting) return
                
                setIsDeleting(true)
                console.log('🟢 [SiteCard] Calling handleDeleteSite...')
                const result = await handleDeleteSite(site.id)
                console.log('🟢 [SiteCard] handleDeleteSite result:', result)
                setIsDeleting(false)
                setIsDeleteDialogOpen(false)
                
                if ('error' in result) {
                  console.error('🟢 [SiteCard] Delete error:', result.error)
                  toast.error(result.error)
                } else {
                  console.log('🟢 [SiteCard] Delete success!')
                  toastSuccess('Site deleted successfully')
                  // Trigger refresh of sites list
                  onStatusChange?.()
                }
              }}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

