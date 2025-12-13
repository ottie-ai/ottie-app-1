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
import { handleArchiveSite, handleUnarchiveSite, handleDuplicateSite, handleDeleteSite, handleReassignSite, handleUpdateSiteTitle, handleSetSitePassword, handleRemoveSitePassword } from '@/app/actions/site-actions'
import { Input } from '@/components/ui/input'
import { LottiePhotoIcon } from '@/components/ui/lottie-photo-icon'
import { LottieAnalyticsIcon } from '@/components/ui/lottie-analytics-icon'
import { LottieEditIcon } from '@/components/ui/lottie-edit-icon'
import { LottieBookIcon } from '@/components/ui/lottie-book-icon'
import { LottieAccountIcon } from '@/components/ui/lottie-account-icon'
import { LottieCopyIcon } from '@/components/ui/lottie-copy-icon'
import { LottieTrashIcon } from '@/components/ui/lottie-trash-icon'
import { LottieInboxIcon } from '@/components/ui/lottie-inbox-icon'
import { LottieLockIcon } from '@/components/ui/lottie-lock-icon'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppData } from '@/contexts/app-context'

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
  password_protected?: boolean // Whether site is password protected
}

interface SiteCardProps {
  site: SiteCardData
  href?: string
  onStatusChange?: () => void // Callback when site status changes
  members?: Array<{ membership: { user_id: string }; profile: { avatar_url: string | null; full_name: string | null; email: string | null } }> // Workspace members for reassign
}

export function SiteCard({ site, href = `/sites/${site.id}`, onStatusChange, members = [] }: SiteCardProps) {
  const { currentWorkspace, isMultiUserPlan } = useAppData()
  const isMultiUser = currentWorkspace ? isMultiUserPlan(currentWorkspace.plan) : false
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(site.title)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [passwordValue, setPasswordValue] = useState('')
  const [isPasswordSaving, setIsPasswordSaving] = useState(false)
  const [isSlugHovered, setIsSlugHovered] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isUnarchiving, setIsUnarchiving] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isReassigning, setIsReassigning] = useState(false)
  const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false)

  // Helper function to handle password save
  const handlePasswordSave = async () => {
    if (isPasswordSaving) return

    setIsPasswordSaving(true)

    try {
      if (passwordValue.trim()) {
        // Set or update password
        const result = await handleSetSitePassword(site.id, passwordValue.trim())
        if ('error' in result) {
          toast.error(result.error)
        } else {
          toastSuccess(site.password_protected ? 'Password updated successfully' : 'Password protection enabled')
          setIsPasswordDialogOpen(false)
          setPasswordValue('')
          onStatusChange?.()
        }
      } else if (site.password_protected) {
        // Remove password protection
        const result = await handleRemoveSitePassword(site.id)
        if ('error' in result) {
          toast.error(result.error)
        } else {
          toastSuccess('Password protection removed')
          setIsPasswordDialogOpen(false)
          setPasswordValue('')
          onStatusChange?.()
        }
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsPasswordSaving(false)
    }
  }

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
    // For custom domains, slug is in the path: https://customdomain.com/slug
    // For ottie.site, slug is in subdomain: https://slug.ottie.site
    const fullUrl = site.domain && site.domain !== 'ottie.site'
      ? `https://${site.domain}/${site.slug}`
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
        <div className="relative aspect-[4/3] bg-muted dark:bg-transparent rounded-2xl overflow-hidden">
          {site.thumbnail ? (
            <img 
              src={site.thumbnail} 
              alt={site.title}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-accent dark:bg-white/10">
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
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setRenameValue(site.title)
                    setIsRenameDialogOpen(true)
                    setIsMenuOpen(false)
                  }}
                >
                  <LottieBookIcon className="size-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setPasswordValue('')
                    setIsPasswordDialogOpen(true)
                    setIsMenuOpen(false)
                  }}
                >
                  <LottieLockIcon className="size-4 mr-2" />
                  {site.password_protected ? 'Change Password' : 'Set Password'}
                </DropdownMenuItem>
                {isMultiUser && members.length > 0 && (
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
          <h3 className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
            {site.password_protected && (
              <LottieLockIcon className="size-3.5 shrink-0" size={14} />
            )}
            <span className="truncate">{site.title}</span>
          </h3>
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

      {/* Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
        setIsPasswordDialogOpen(open)
        if (!open) {
          setPasswordValue('') // Reset on close
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {site.password_protected ? 'Change Password' : 'Set Password Protection'}
            </DialogTitle>
            <DialogDescription>
              {site.password_protected 
                ? 'Enter a new password for this site. Leave empty to remove password protection.'
                : 'Set a password to protect this site from public access.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="site-password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="site-password"
                type="password"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder="Enter password"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && passwordValue.trim()) {
                    handlePasswordSave()
                  } else if (e.key === 'Escape') {
                    setPasswordValue('')
                    setIsPasswordDialogOpen(false)
                  }
                }}
              />
              {site.password_protected && (
                <p className="text-sm text-muted-foreground">
                  Leave empty to remove password protection
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordValue('')
                setIsPasswordDialogOpen(false)
              }}
              disabled={isPasswordSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordSave}
              disabled={isPasswordSaving || (!passwordValue.trim() && !site.password_protected)}
            >
              {isPasswordSaving 
                ? 'Saving...' 
                : passwordValue.trim() 
                  ? (site.password_protected ? 'Update Password' : 'Set Password')
                  : 'Remove Protection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={(open) => {
        setIsRenameDialogOpen(open)
        if (!open) {
          setRenameValue(site.title) // Reset on close
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Site</DialogTitle>
            <DialogDescription>
              Enter a new name for this site.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Site title"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (renameValue.trim() && renameValue !== site.title) {
                    handleUpdateSiteTitle(site.id, renameValue.trim()).then((result) => {
                      if ('error' in result) {
                        toast.error(result.error)
                      } else {
                        toastSuccess('Site renamed successfully')
                        setIsRenameDialogOpen(false)
                        onStatusChange?.()
                      }
                    })
                  } else {
                    setIsRenameDialogOpen(false)
                  }
                } else if (e.key === 'Escape') {
                  setRenameValue(site.title)
                  setIsRenameDialogOpen(false)
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameValue(site.title)
                setIsRenameDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (renameValue.trim() && renameValue !== site.title) {
                  const result = await handleUpdateSiteTitle(site.id, renameValue.trim())
                  if ('error' in result) {
                    toast.error(result.error)
                  } else {
                    toastSuccess('Site renamed successfully')
                    setIsRenameDialogOpen(false)
                    onStatusChange?.()
                  }
                } else {
                  setIsRenameDialogOpen(false)
                }
              }}
              disabled={!renameValue.trim() || renameValue === site.title}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

