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
  views?: number
  lastEdited?: string
  thumbnail: string | null
  avatar?: string | null
  avatarFallback?: string
  domain?: string // Domain where site is hosted (default: 'ottie.site', can be custom domain)
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
          {/* Views in bottom right corner */}
          {site.views !== undefined && (
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border/50">
              <Eye className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{site.views.toLocaleString()}</span>
            </div>
          )}
          
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
                      onClick={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (isReassigning || site.assigned_agent_id === null) return
                        
                        setIsReassigning(true)
                        const result = await handleReassignSite(site.id, null)
                        setIsReassigning(false)
                        setIsMenuOpen(false)
                        
                        if ('error' in result) {
                          toast.error(result.error)
                        } else {
                          toastSuccess('Site reassigned successfully')
                          onStatusChange?.()
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
                          
                          setIsReassigning(true)
                          const result = await handleReassignSite(site.id, member.membership.user_id)
                          setIsReassigning(false)
                          setIsMenuOpen(false)
                          
                          if ('error' in result) {
                            toast.error(result.error)
                          } else {
                            toastSuccess('Site reassigned successfully')
                            onStatusChange?.()
                          }
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
                      // Trigger refresh of sites list
                      onStatusChange?.()
                    }
                  }}
                  disabled={isDuplicating}
                >
                  <LottieCopyIcon className="size-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
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
                  variant="destructive"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
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
              {isCopied ? (
                <Check className="size-3 text-green-600 dark:text-green-400" />
              ) : (
                <LottieCopyIcon className="size-3" />
              )}
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
                if (isDeleting) return
                
                setIsDeleting(true)
                const result = await handleDeleteSite(site.id)
                setIsDeleting(false)
                setIsDeleteDialogOpen(false)
                
                if ('error' in result) {
                  toast.error(result.error)
                } else {
                  toastSuccess('Site deleted successfully')
                  // Trigger refresh of sites list
                  onStatusChange?.()
                }
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

