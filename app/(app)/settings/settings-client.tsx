'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { Sun, Moon, Monitor, Check, AlertTriangle, Trash2, Globe } from 'lucide-react'
import { LottieSpinner } from '@/components/ui/lottie-spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PricingDialog } from '@/components/workspace/pricing-dialog'
import { RoleSelect } from '@/components/workspace/role-select'
import { updateUserProfile, getCurrentUserProfile, removeAvatar, checkWorkspacesForDeletion, deleteUserAccount, updateWorkspaceName, uploadWorkspaceLogo, removeWorkspaceLogo, updateWorkspaceAction, updateMembershipRole, resetWorkspace, sendPasswordResetEmail, createInvitation, cancelInvitation, resendInvitation } from './actions'
import { useUserProfile, useWorkspace, useAppData } from '@/contexts/app-context'
import { useWorkspaceMembers } from '@/hooks/use-workspace-members'
import { useWorkspaceInvitations } from '@/hooks/use-workspace-invitations'
import { normalizePlan } from '@/lib/utils'
import { signOut as signOutAuth } from '@/lib/supabase/auth'
import type { Profile, Workspace, Membership, Invitation } from '@/types/database'
import { useQueryClient } from '@tanstack/react-query'
import { transformPlansToTiers } from '@/lib/pricing-data'
import { Mail, Plus, AlertCircle, ArrowRight, Check as CheckIcon, ExternalLink, Clock, X, RotateCw, Crown } from 'lucide-react'
import { LottieLinkIconFocus } from '@/components/ui/lottie-link-icon-focus'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { UserRole } from '@/types/database'

// Serializable user data passed from server component
// We don't use the full User type because it's not fully serializable
interface SerializableUser {
  id: string
  email: string
  user_metadata: {
    full_name: string | null
    avatar_url: string | null
    picture: string | null
  }
  app_metadata: {
    provider: string | null
  }
  identities: { provider: string }[]
}

interface SettingsClientProps {
  user: SerializableUser
  userMetadata: {
    fullName: string
    avatarUrl: string
    email: string
    isGoogleSignIn: boolean
  }
}

export function SettingsClient({ user: serverUser, userMetadata }: SettingsClientProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { user: clientUser } = useAuth()
  const queryClient = useQueryClient()
  
  // Get data from context (already loaded in layout via AppProvider)
  const { profile: profileFromContext, userAvatar, userName, refresh: refreshUserProfile } = useUserProfile()
  const { workspace: workspaceFromContext, refresh: refreshWorkspace } = useWorkspace()
  const { currentMembership, loading: appDataLoading, isMultiUserPlan, plans } = useAppData()
  
  // Transform database plans to pricing tiers (with prices from database in cents -> dollars)
  const pricingTiers = transformPlansToTiers(plans)
  
  // Use data from context (preferred) or fallback to null
  const profile = profileFromContext
  const workspace = workspaceFromContext
  const membership = currentMembership
  
  // Use client-side user if available (more reliable), otherwise fall back to server user
  const user = clientUser || serverUser
  
  // Check if user has password provider (can reset password)
  // User has password if they have 'email' identity provider
  const hasPassword = user?.identities?.some((identity: { provider: string }) => identity.provider === 'email') || false
  
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'profile'
  const [activeTab, setActiveTab] = useState(initialTab)
  
  // Update active tab when URL changes (only if different to prevent race conditions)
  useEffect(() => {
    const tab = searchParams.get('tab') || 'profile'
    if (tab !== activeTab) {
    setActiveTab(tab)
    }
  }, [searchParams, activeTab])
  
  // Local state for form inputs (synced with context data)
  const [workspaceName, setWorkspaceName] = useState(workspace?.name || '')
  const [originalWorkspaceName, setOriginalWorkspaceName] = useState(workspace?.name || '')
  const [workspaceLogoFile, setWorkspaceLogoFile] = useState<File | null>(null)
  const [workspaceLogoPreview, setWorkspaceLogoPreview] = useState<string | null>(null)
  const [workspaceLogoUrl, setWorkspaceLogoUrl] = useState(workspace?.logo_url || '')
  const [originalWorkspaceLogoUrl, setOriginalWorkspaceLogoUrl] = useState(workspace?.logo_url || '')
  const workspaceLogoInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [savingWorkspace, setSavingWorkspace] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Sync workspace form state with context data when it changes
  useEffect(() => {
    if (workspace) {
      setWorkspaceName(workspace.name || '')
      setOriginalWorkspaceName(workspace.name || '')
      setWorkspaceLogoUrl(workspace.logo_url || '')
      setOriginalWorkspaceLogoUrl(workspace.logo_url || '')
    }
  }, [workspace])
  
  // Check if workspace settings should be shown (only for multi-user plans and owner/admin role)
  const isOwnerOrAdmin = membership?.role === 'owner' || membership?.role === 'admin'
  const isOwner = membership?.role === 'owner'
  const isAgent = membership?.role === 'agent'
  const showWorkspaceSettings = workspace && isMultiUserPlan(workspace.plan) && isOwnerOrAdmin
  const showTeamTab = !isAgent
  const showBillingTab = isOwner // Only owner can see billing/upgrade
  
  // Load workspace members (client-side with React Query)
  // N+1 Prevention: useWorkspaceMembers uses JOIN query to fetch all members with profiles in a single query
  const { members, loading: membersLoading } = useWorkspaceMembers(workspace?.id || null)
  
  // Load pending invitations (client-side with React Query)
  const { invitations, loading: invitationsLoading, refresh: refreshInvitations } = useWorkspaceInvitations(workspace?.id || null)
  
  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'agent'>('agent')
  const [inviteLoading, setInviteLoading] = useState(false)
  
  // Role update loading state (track which membership is being updated)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)
  
  // Sync workspaceName when workspace changes
  useEffect(() => {
    if (workspace?.name) {
      setWorkspaceName(workspace.name)
      setOriginalWorkspaceName(workspace.name)
    }
  }, [workspace?.id, workspace?.name])

  // Detect if we're on mobile
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // Open UserJot feedback widget
  const openUserJot = () => {
    if (typeof window === 'undefined') return

    const win = window as any
    
    // Use the official UserJot API to show widget
    if (win.uj && win.uj.showWidget) {
      win.uj.showWidget({ section: 'feedback' })
    } else if (win.$ujq) {
      // Queue the command if SDK is still loading
      win.$ujq.push(['showWidget', { section: 'feedback' }])
    } else {
      // Initialize queue and push command
      win.$ujq = []
      win.$ujq.push(['showWidget', { section: 'feedback' }])
    }
  }

  // Delete account dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [workspacesToDelete, setWorkspacesToDelete] = useState<Array<{ id: string; name: string; memberCount: number }>>([])
  const [hasMultiUserWorkspace, setHasMultiUserWorkspace] = useState(false)

  // Reset workspace state
  const [resetWorkspaceLoading, setResetWorkspaceLoading] = useState(false)

  // Form state - initialize from context data
  // IMPORTANT: Only use profile.avatar_url, never userMetadata.avatarUrl (which may contain Google avatar)
  const [fullName, setFullName] = useState(
    profile?.full_name || userMetadata.fullName || ''
  )
  const [avatarUrl, setAvatarUrl] = useState(
    profile?.avatar_url || '' // Only use profile avatar, never Google avatar fallback
  )
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Original values to track changes
  // IMPORTANT: Only use profile.avatar_url, never userMetadata.avatarUrl
  const [originalFullName, setOriginalFullName] = useState(
    profile?.full_name || userMetadata.fullName || ''
  )
  const [originalAvatarUrl, setOriginalAvatarUrl] = useState(
    profile?.avatar_url || '' // Only use profile avatar, never Google avatar fallback
  )

  // Track the last synced values to detect when profile data changes
  const lastSyncedValues = useRef<{ name: string; avatar: string } | null>(null)
  
  // Update form values when profile data changes (from context)
  useEffect(() => {
    if (profile) {
      const name = profile.full_name || userMetadata.fullName || ''
      const avatar = profile.avatar_url || '' // ONLY use profile avatar, never Google avatar
      
      // Check if values actually changed
      const valuesChanged = 
        lastSyncedValues.current === null ||
        lastSyncedValues.current.name !== name ||
        lastSyncedValues.current.avatar !== avatar
      
      if (valuesChanged) {
        lastSyncedValues.current = { name, avatar }
        
        // Always update original values to match server data
        setOriginalFullName(name)
        setOriginalAvatarUrl(avatar)
        
        // Reset form values to match server data (only if no file is selected)
        if (!avatarFile) {
          setFullName(name)
          setAvatarUrl(avatar)
        }
      }
    } else if (!profile && userMetadata) {
      // Fallback to userMetadata for name only, never for avatar
      const name = userMetadata.fullName || ''
      const avatar = '' // Never use Google avatar, only profile avatar
      
      const valuesChanged = 
        lastSyncedValues.current === null ||
        lastSyncedValues.current.name !== name ||
        lastSyncedValues.current.avatar !== avatar
      
      if (valuesChanged) {
        lastSyncedValues.current = { name, avatar }
        setOriginalFullName(name)
        setOriginalAvatarUrl(avatar)
        if (!avatarFile) {
          setFullName(name)
          setAvatarUrl(avatar)
        }
      }
    }
  }, [profile?.full_name, profile?.avatar_url, avatarFile, userMetadata.fullName])

  // Unsaved changes dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingTab, setPendingTab] = useState<string | null>(null)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    // Normalize values for comparison (null/undefined -> empty string)
    const normalizedFullName = (fullName || '').trim()
    const normalizedOriginalFullName = (originalFullName || '').trim()
    const normalizedAvatarUrl = (avatarUrl || '').trim()
    const normalizedOriginalAvatarUrl = (originalAvatarUrl || '').trim()
    
    // Check if name changed
    if (normalizedFullName !== normalizedOriginalFullName) {
      return true
    }
    // Check if avatar file is selected (new upload)
    if (avatarFile !== null) {
      return true
    }
    // Check if avatar URL changed (manual URL input)
    if (normalizedAvatarUrl !== normalizedOriginalAvatarUrl) {
      return true
    }
    return false
  }, [fullName, avatarUrl, originalFullName, originalAvatarUrl, avatarFile])

  // Handle navigation attempt when there are unsaved changes
  const handleNavigationAttempt = useCallback((targetPath: string) => {
    setPendingNavigation(targetPath)
    setShowUnsavedDialog(true)
  }, [])

  // Use the unsaved changes hook to intercept navigation
  const { navigateTo } = useUnsavedChanges({
    hasChanges: hasUnsavedChanges(),
    onNavigationAttempt: handleNavigationAttempt,
  })

  // Handle tab change with unsaved changes check
  // OPTIMIZATION: Instant tab switching (like Linear) - no delay
  const handleTabChange = useCallback((newTab: string) => {
    // Prevent unnecessary updates if already on this tab
    if (newTab === activeTab) {
      return
    }
    
    if (hasUnsavedChanges()) {
      setPendingTab(newTab)
      setShowUnsavedDialog(true)
      return // Don't change tab if there are unsaved changes
    }
    
    // Update URL without re-render using native History API
    // This doesn't trigger Next.js router and keeps tab switching instant
      const newUrl = `/settings${newTab !== 'profile' ? `?tab=${newTab}` : ''}`
    window.history.replaceState(null, '', newUrl)
  }, [activeTab, hasUnsavedChanges])

  // Handle dialog actions
  const handleSaveAndContinue = async () => {
    if (!user?.id) {
      console.error('Cannot save: user ID not available')
      return
    }
    
    // Trigger form submission
    const formData = new FormData()
    formData.append('fullName', fullName)
    if (avatarFile) {
      formData.append('avatarFile', avatarFile)
    } else if (avatarUrl) {
      formData.append('avatarUrl', avatarUrl)
    }
    
    setSaving(true)
    const result = await updateUserProfile(user.id, formData)
    setSaving(false)
    
    if (result.success && result.profile) {
      // Profile updated - refresh from context
      refreshUserProfile()
      setOriginalFullName(fullName)
      setOriginalAvatarUrl(result.profile.avatar_url || '')
      setAvatarFile(null)
      setAvatarPreview(null)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      // Refresh user profile in all components (sidebar, navbar, etc.)
      refreshUserProfile()
    }
    
    // Continue with navigation
    if (pendingTab) {
      setActiveTab(pendingTab)
      setPendingTab(null)
    }
    if (pendingNavigation) {
      navigateTo(pendingNavigation)
      setPendingNavigation(null)
    }
    setShowUnsavedDialog(false)
  }

  const handleDiscard = () => {
    // Reset form to original values
    setFullName(originalFullName)
    setAvatarUrl(originalAvatarUrl)
    setAvatarFile(null)
    setAvatarPreview(null)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    
    // Continue with navigation
    if (pendingTab) {
      setActiveTab(pendingTab)
      setPendingTab(null)
    }
    if (pendingNavigation) {
      navigateTo(pendingNavigation)
      setPendingNavigation(null)
    }
    setShowUnsavedDialog(false)
  }

  const handleCancelDialog = () => {
    setPendingTab(null)
    setPendingNavigation(null)
    setShowUnsavedDialog(false)
  }

  // Warn about unsaved changes when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Get user data for display (use from context hooks)
  const displayUserName = userName || userMetadata.fullName || user.email?.split('@')[0] || 'User'
  const userEmail = userMetadata.email
  // Always use profile.avatar_url from database (profile always exists)
  // Use preview if available, otherwise use profile avatar directly (updates immediately after delete)
  const displayAvatar = avatarPreview || profile?.avatar_url || userAvatar || ''

  // Check if avatar exists (not just initials)
  const hasAvatar = displayAvatar && displayAvatar.trim() !== ''

  // Handle avatar deletion
  const handleDeleteAvatar = async () => {
    if (!user?.id) {
      const errorMsg = 'User not authenticated. Please refresh the page.'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    if (!confirm('Are you sure you want to remove your avatar?')) {
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    const result = await removeAvatar(user.id)

    if ('error' in result) {
      setError(result.error)
      toast.error(result.error)
    } else if (result.success) {
      // Refresh profile from server
      const refreshedProfile = await getCurrentUserProfile(user.id)
      if (refreshedProfile) {
        // Profile updated - refresh from context
        refreshUserProfile()
        setAvatarUrl(refreshedProfile.avatar_url || '')
        setOriginalAvatarUrl(refreshedProfile.avatar_url || '')
      }
      setAvatarFile(null)
      setAvatarPreview(null)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      // Refresh user profile in all components
      refreshUserProfile()
      setSuccess(true)
      toast.success('Avatar removed successfully!')
      setTimeout(() => setSuccess(false), 3000)
    }

    setSaving(false)
  }

  // Get initials for avatar fallback
  const getInitials = (name: string, email: string) => {
    if (name && name !== email.split('@')[0]) {
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }
  

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id) {
      const errorMsg = 'User not authenticated. Please refresh the page.'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.append('fullName', fullName)
    if (avatarFile) {
      formData.append('avatarFile', avatarFile)
    } else if (avatarUrl) {
      formData.append('avatarUrl', avatarUrl)
    }

    const result = await updateUserProfile(user.id, formData)

    if (result.error) {
      setError(result.error)
      toast.error(result.error)
    } else if (result.success && result.profile) {
      // Profile updated - refresh from context
      refreshUserProfile()
      // Update original values after successful save
      setOriginalFullName(fullName)
      setOriginalAvatarUrl(result.profile.avatar_url || '')
      setAvatarFile(null)
      setAvatarPreview(null)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      // Refresh user profile in all components (sidebar, navbar, etc.)
      refreshUserProfile()
      setSuccess(true)
      toast.success('Profile updated successfully!')
      // Show warning if avatar upload failed but profile was saved
      if ('warning' in result && result.warning) {
        const warningMessage = typeof result.warning === 'string' ? result.warning : String(result.warning)
        setError(warningMessage)
        toast.warning(warningMessage)
        setTimeout(() => setError(null), 5000)
      } else {
        setTimeout(() => setSuccess(false), 3000)
      }
    }

    setSaving(false)
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        const errorMsg = 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.'
        setError(errorMsg)
        toast.error(errorMsg)
        return
      }

      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024 // 2MB
      if (file.size > maxSize) {
        const errorMsg = 'File size too large. Maximum size is 2MB.'
        setError(errorMsg)
        toast.error(errorMsg)
        return
      }

      setAvatarFile(file)
      setError(null)

      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - fixed at top */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Settings</h1>
          <p className="text-xs text-muted-foreground">
            {showWorkspaceSettings 
              ? 'View and manage your workspace settings.' 
              : 'View and manage your account settings.'}
          </p>
        </div>
      </header>

      {/* Main Content with Top Tabs */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Tabs defaultValue={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
          {/* Content - scrollable and centered */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="max-w-4xl mx-auto">
              {/* Top Tabs - hidden on mobile, shown on desktop */}
              <div className="hidden sm:block px-4 sm:px-6 pt-4 sm:pt-6">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="profile">Account</TabsTrigger>
                  {showWorkspaceSettings && (
                    <TabsTrigger value="workspace">Workspace</TabsTrigger>
                  )}
                  {showTeamTab && (
                  <TabsTrigger value="team">Team</TabsTrigger>
                  )}
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  {showBillingTab && (
                  <TabsTrigger value="plan">Billing</TabsTrigger>
                  )}
                  <TabsTrigger value="domain">Domain</TabsTrigger>
                  <TabsTrigger value="integrations">Integrations</TabsTrigger>
                  <TabsTrigger value="data">Data</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-4 sm:p-6">
              {/* Account Tab */}
              {isMobile ? (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Account</CardTitle>
                    <CardDescription>
                    Manage your personal information and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>

                {appDataLoading ? (
                  <div className="space-y-4">
                    {/* Avatar skeleton */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <Skeleton className="h-5 w-20" />
                      <div className="flex items-center gap-4">
                        <Skeleton className="size-20 rounded-full" />
                        <div className="flex flex-col gap-2 w-full sm:w-64">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                      </div>
                    </div>
                    <Separator />
                    {/* Full Name skeleton */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-10 w-full sm:w-64" />
                    </div>
                    <Separator />
                    {/* Email skeleton */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-10 w-full sm:w-64" />
                    </div>
                    <Separator />
                    {/* Password skeleton */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-6 w-32" />
                    </div>
                    {/* Save button skeleton */}
                    <div className="flex justify-start mt-10">
                      <Skeleton className="h-10 w-32" />
                    </div>
                  </div>
                ) : (
                <form id="profile-form" onSubmit={handleSaveProfile} className="space-y-4">

                {/* Avatar */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <Label htmlFor="avatar" className="text-sm font-medium pt-2">Avatar</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <Avatar className="size-20 shrink-0">
                          <AvatarImage src={displayAvatar || undefined} alt={displayUserName} />
                          <AvatarFallback className="text-2xl">
                            {getInitials(displayUserName, userEmail)}
                          </AvatarFallback>
                      </Avatar>
                      {hasAvatar && (
                        <div 
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center cursor-pointer" 
                          onClick={handleDeleteAvatar}
                          title="Delete avatar"
                        >
                          <Trash2 className="size-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 w-full sm:w-64">
                      <Input
                        ref={fileInputRef}
                        id="avatarFile"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleFileChange}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload a JPEG, PNG, GIF, or WebP image (max 2MB)
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                  {/* Full Name */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <Label htmlFor="fullName" className="text-sm font-medium">Full name</Label>
                  <div className="flex items-center gap-3">
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                      className="w-full sm:w-64"
                      />
                  </div>
                </div>

                <Separator />

                  {/* Email (Read-only) */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col gap-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  </div>
                    <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                        <Input
                          id="email"
                          type="email"
                          value={userEmail}
                          disabled
                          className="w-full sm:w-64 bg-muted"
                        />
                  </div>
                      {userMetadata.isGoogleSignIn ? (
                        <Badge variant="secondary" className="w-fit text-xs flex items-center gap-1.5">
                          <svg className="h-3 w-3" viewBox="0 0 24 24">
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                          </svg>
                          Linked to Google Account
                        </Badge>
                      ) : (
                        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                      )}
                </div>
              </div>

                <Separator />

                {/* Password */}
                {/* TODO: Remove debug - change back to {hasPassword && ( */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!userEmail) return
                        await sendPasswordResetEmail(userEmail)
                        toast.success('Check your email for a password reset link. If an account exists with this email, you will receive the link shortly.')
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      {hasPassword ? 'Reset password' : 'Request reset password email'}
                    </button>
                  </div>
                </div>

              {/* Save Button */}
              <div className="flex justify-start mt-10">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button 
                        type="submit" 
                        disabled={saving || (fullName.trim() === originalFullName.trim() && !avatarFile && avatarUrl === originalAvatarUrl)}
                      >
                      {saving ? (
                        <>
                          <LottieSpinner size={16} className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                  <Check className="size-4 mr-2" />
                  Save changes
                        </>
                      )}
                </Button>
                    </span>
                  </TooltipTrigger>
                  {!saving && (fullName.trim() === originalFullName.trim() && !avatarFile && avatarUrl === originalAvatarUrl) && (
                    <TooltipContent>
                      <p>No changes to save</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
                </form>
                )}

                  </CardContent>
                </Card>
              ) : (
                <TabsContent value="profile" forceMount className="mt-0 sm:mt-6 space-y-6">
                  {/* Duplicate content for desktop - same as mobile */}
                <div>
                    <h2 className="text-lg font-semibold">Account</h2>
                  <p className="text-sm text-muted-foreground">
                      Manage your personal information and preferences
                  </p>
                </div>

                  {appDataLoading ? (
                    <div className="space-y-4">
                      {/* Avatar skeleton */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <Skeleton className="h-5 w-20" />
                        <div className="flex items-center gap-4">
                          <Skeleton className="size-20 rounded-full" />
                          <div className="flex flex-col gap-2 w-full sm:w-64">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-4 w-48" />
                          </div>
                        </div>
                      </div>
                      <Separator />
                      {/* Full Name skeleton */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-10 w-full sm:w-64" />
                      </div>
                      <Separator />
                      {/* Email skeleton */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-10 w-full sm:w-64" />
                      </div>
                      <Separator />
                      {/* Password skeleton */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-6 w-32" />
                      </div>
                      {/* Save button skeleton */}
                      <div className="flex justify-start mt-10">
                        <Skeleton className="h-10 w-32" />
                      </div>
                    </div>
                  ) : (
                    <form id="profile-form-desktop" onSubmit={handleSaveProfile} className="space-y-4">
                      {/* Avatar */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <Label htmlFor="avatar-desktop" className="text-sm font-medium pt-2">Avatar</Label>
                        <div className="flex items-center gap-4">
                          <div className="relative group">
                            <Avatar className="size-20 shrink-0">
                                <AvatarImage src={displayAvatar || undefined} alt={userName} />
                                <AvatarFallback className="text-2xl">
                                  {getInitials(userName, userEmail)}
                                </AvatarFallback>
                            </Avatar>
                            {hasAvatar && (
                              <div 
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center cursor-pointer" 
                                onClick={handleDeleteAvatar}
                                title="Delete avatar"
                              >
                                <Trash2 className="size-6 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 w-full sm:w-64">
                            <Input
                              ref={fileInputRef}
                              id="avatarFile-desktop"
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                              onChange={handleFileChange}
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                              Upload a JPEG, PNG, GIF, or WebP image (max 2MB)
                            </p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Full Name */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <Label htmlFor="fullName-desktop" className="text-sm font-medium">Full name</Label>
                        <div className="flex items-center gap-3">
                          <Input 
                            id="fullName-desktop" 
                            value={fullName} 
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="John Doe" 
                            className="w-full sm:w-64"
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Email (Read-only) */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="email-desktop" className="text-sm font-medium">Email</Label>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <Input
                              id="email-desktop"
                              type="email"
                              value={userEmail}
                              disabled
                              className="w-full sm:w-64 bg-muted"
                            />
                          </div>
                          {userMetadata.isGoogleSignIn ? (
                            <Badge variant="secondary" className="w-fit text-xs flex items-center gap-1.5">
                              <svg className="h-3 w-3" viewBox="0 0 24 24">
                                <path
                                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                  fill="#4285F4"
                                />
                                <path
                                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                  fill="#34A853"
                                />
                                <path
                                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                  fill="#FBBC05"
                                />
                                <path
                                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                  fill="#EA4335"
                                />
                              </svg>
                              Linked to Google Account
                            </Badge>
                          ) : (
                            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Password */}
                      {/* TODO: Remove debug - change back to {hasPassword && ( */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="password-desktop" className="text-sm font-medium">Password</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!userEmail) return
                              await sendPasswordResetEmail(userEmail)
                              toast.success('Check your email for a password reset link. If an account exists with this email, you will receive the link shortly.')
                            }}
                            className="text-sm text-primary hover:underline"
                          >
                            {hasPassword ? 'Reset password' : 'Request reset password email'}
                          </button>
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-start mt-10">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-block">
                              <Button 
                                type="submit" 
                                disabled={saving || (fullName.trim() === originalFullName.trim() && !avatarFile && avatarUrl === originalAvatarUrl)}
                              >
                                {saving ? (
                                  <>
                                    <LottieSpinner size={16} className="mr-2" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Check className="size-4 mr-2" />
                                    Save changes
                                  </>
                                )}
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {!saving && (fullName.trim() === originalFullName.trim() && !avatarFile && avatarUrl === originalAvatarUrl) && (
                            <TooltipContent>
                              <p>No changes to save</p>
                            </TooltipContent>
                          )}
                      </Tooltip>
                    </div>
                    </form>
                  )}

                </TabsContent>
              )}

              {/* Workspace Tab - Only shown for multi-user plans (agency/enterprise) */}
              {showWorkspaceSettings && (
                <>
                  {isMobile ? (
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle>Workspace</CardTitle>
                        <CardDescription>
                          Manage your workspace settings and team
                        </CardDescription>
                      </CardHeader>
                      <CardContent>

                {/* Settings Fields */}
                    <form 
                    id="workspace-form"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      if (!workspace || !user?.id) return
                      
                      const hasNameChange = workspaceName.trim() !== originalWorkspaceName.trim()
                      const hasLogoChange = workspaceLogoFile !== null

                      if (!hasNameChange && !hasLogoChange) return

                      setSavingWorkspace(true)

                      // Upload logo first if there's a new file
                      let logoUrl = workspaceLogoUrl
                      if (workspaceLogoFile) {
                        const uploadResult = await uploadWorkspaceLogo(workspace.id, user.id, workspaceLogoFile)
                        if ('error' in uploadResult) {
                          toast.error(uploadResult.error)
                          setSavingWorkspace(false)
                          return
                        }
                        logoUrl = uploadResult.url
                      }

                      // Update workspace name if changed
                      if (hasNameChange) {
                        const result = await updateWorkspaceName(workspace.id, user.id, workspaceName.trim())

                        if ('error' in result) {
                          toast.error(result.error)
                          // Revert to original value on error
                          setWorkspaceName(originalWorkspaceName)
                          setSavingWorkspace(false)
                          return
                        } else {
                          // Workspace updated - refresh from context
                          refreshWorkspace()
                          setOriginalWorkspaceName(result.workspace.name)
                          setWorkspaceName(result.workspace.name)
                        }
                      }

                      // Update workspace logo if changed
                      if (hasLogoChange) {
                        const result = await updateWorkspaceAction(workspace.id, user.id, { logo_url: logoUrl })
                        if ('error' in result) {
                          toast.error(result.error)
                          setSavingWorkspace(false)
                          return
                        } else {
                          // Workspace updated - refresh from context
                          refreshWorkspace()
                          setWorkspaceLogoUrl(logoUrl)
                          setOriginalWorkspaceLogoUrl(logoUrl)
                          setWorkspaceLogoFile(null)
                          setWorkspaceLogoPreview(null)
                          if (workspaceLogoInputRef.current) {
                            workspaceLogoInputRef.current.value = ''
                          }
                        }
                      }

                      // Refresh workspace in sidebar and other components
                      await refreshWorkspace()
                      toast.success('Workspace updated successfully!')
                      setSavingWorkspace(false)
                    }}
                    className="space-y-4"
                  >
                    {/* Workspace Logo */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <Label htmlFor="workspaceLogo" className="text-sm font-medium pt-2">Logo</Label>
                      <div className="flex items-center gap-4">
                        <div className="relative group">
                          <Avatar className="size-20 shrink-0">
                            <AvatarImage src={workspaceLogoPreview || workspaceLogoUrl || undefined} alt={workspaceName} />
                            <AvatarFallback className="text-2xl">
                              {workspaceName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {(workspaceLogoPreview || workspaceLogoUrl) && (
                            <div 
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center cursor-pointer" 
                              onClick={async () => {
                                if (!workspace || !user?.id) return
                                
                                const result = await removeWorkspaceLogo(workspace.id, user.id)
                                if ('error' in result) {
                                  toast.error(result.error)
                                } else {
                                  // Workspace updated - refresh from context
                          refreshWorkspace()
                                  setWorkspaceLogoUrl('')
                                  setOriginalWorkspaceLogoUrl('')
                                  setWorkspaceLogoFile(null)
                                  setWorkspaceLogoPreview(null)
                                  if (workspaceLogoInputRef.current) {
                                    workspaceLogoInputRef.current.value = ''
                                  }
                                  await refreshWorkspace()
                                  toast.success('Logo removed successfully!')
                                }
                              }}
                              title="Delete logo"
                            >
                              <Trash2 className="size-6 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 w-full sm:w-64">
                          <Input
                            ref={workspaceLogoInputRef}
                            id="workspaceLogoFile"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                // Validate file type (SVG excluded due to XSS risk from embedded JavaScript)
                                const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
                                if (!validTypes.includes(file.type)) {
                                  toast.error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.')
                                  return
                                }

                                // Validate file size (max 2MB)
                                const maxSize = 2 * 1024 * 1024 // 2MB
                                if (file.size > maxSize) {
                                  toast.error('File size too large. Maximum size is 2MB.')
                                  return
                                }

                                setWorkspaceLogoFile(file)

                                // Create preview
                                const reader = new FileReader()
                                reader.onload = () => {
                                  setWorkspaceLogoPreview(reader.result as string)
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                            className="w-full"
                            disabled={savingWorkspace}
                          />
                          <p className="text-xs text-muted-foreground">
                            Upload a JPEG, PNG, GIF, WebP, or SVG image (max 2MB)
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Workspace Name */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <Label htmlFor="workspaceName" className="text-sm font-medium">Workspace name</Label>
                    <div className="flex items-center gap-3">
                        <Input 
                          id="workspaceName" 
                          value={workspaceName} 
                          onChange={(e) => setWorkspaceName(e.target.value)}
                          placeholder="Acme Real Estate" 
                          className="w-full sm:w-64"
                          disabled={savingWorkspace}
                        />
                    </div>
                  </div>

                  <Separator />

                  {/* Website */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <Label htmlFor="website" className="text-sm font-medium">Website</Label>
                    <div className="flex items-center gap-3">
                        <Input id="website" type="url" placeholder="https://example.com" className="w-full sm:w-64" />
                    </div>
                  </div>

                  <Separator />

                  {/* License */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <Label htmlFor="license" className="text-sm font-medium">License number</Label>
                    <div className="flex items-center gap-3">
                        <Input id="license" placeholder="DRE #01234567" className="w-full sm:w-64" />
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-start mt-10">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            <Button 
                              type="submit"
                              disabled={savingWorkspace || ((!workspaceName.trim() || workspaceName.trim() === originalWorkspaceName.trim()) && !workspaceLogoFile)}
                            >
                              {savingWorkspace ? (
                                <>
                                  <LottieSpinner size={16} className="mr-2" />
                                  Saving...
                                </>
                              ) : (
                                <>
                    <Check className="size-4 mr-2" />
                    Save changes
                                </>
                              )}
                  </Button>
                          </span>
                        </TooltipTrigger>
                        {!savingWorkspace && ((!workspaceName.trim() || workspaceName.trim() === originalWorkspaceName.trim()) && !workspaceLogoFile) && (
                          <TooltipContent>
                            <p>No changes to save</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                </div>
                  </form>

                      </CardContent>
                    </Card>
                  ) : (
                    <TabsContent value="workspace" forceMount className="mt-0 sm:mt-6 space-y-6">
                <div>
                        <h2 className="text-lg font-semibold">Workspace</h2>
                  <p className="text-sm text-muted-foreground">
                          Manage your workspace settings and team
                  </p>
                </div>

                      {/* Settings Fields */}
                      <form 
                        id="workspace-form-desktop"
                        onSubmit={async (e) => {
                          e.preventDefault()
                          if (!workspace || !user?.id) return
                          
                          const hasNameChange = workspaceName.trim() !== originalWorkspaceName.trim()
                          const hasLogoChange = workspaceLogoFile !== null

                          if (!hasNameChange && !hasLogoChange) return

                          setSavingWorkspace(true)

                          // Upload logo first if there's a new file
                          let logoUrl = workspaceLogoUrl
                          if (workspaceLogoFile) {
                            const uploadResult = await uploadWorkspaceLogo(workspace.id, user.id, workspaceLogoFile)
                            if ('error' in uploadResult) {
                              toast.error(uploadResult.error)
                              setSavingWorkspace(false)
                              return
                            }
                            logoUrl = uploadResult.url
                          }

                          // Update workspace name if changed
                          if (hasNameChange) {
                            const result = await updateWorkspaceName(workspace.id, user.id, workspaceName.trim())

                            if ('error' in result) {
                              toast.error(result.error)
                              // Revert to original value on error
                              setWorkspaceName(originalWorkspaceName)
                              setSavingWorkspace(false)
                              return
                            } else {
                              // Workspace updated - refresh from context
                          refreshWorkspace()
                              setOriginalWorkspaceName(result.workspace.name)
                              setWorkspaceName(result.workspace.name)
                            }
                          }

                          // Update workspace logo if changed
                          if (hasLogoChange) {
                            const result = await updateWorkspaceAction(workspace.id, user.id, { logo_url: logoUrl })
                            if ('error' in result) {
                              toast.error(result.error)
                              setSavingWorkspace(false)
                              return
                            } else {
                              // Workspace updated - refresh from context
                          refreshWorkspace()
                              setWorkspaceLogoUrl(logoUrl)
                              setOriginalWorkspaceLogoUrl(logoUrl)
                              setWorkspaceLogoFile(null)
                              setWorkspaceLogoPreview(null)
                              if (workspaceLogoInputRef.current) {
                                workspaceLogoInputRef.current.value = ''
                              }
                            }
                          }

                          // Refresh workspace in sidebar and other components
                          await refreshWorkspace()
                          toast.success('Workspace updated successfully!')
                          setSavingWorkspace(false)
                        }}
                        className="space-y-4"
                      >
                        {/* Workspace Logo */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <Label htmlFor="workspaceLogo-desktop" className="text-sm font-medium pt-2">Logo</Label>
                          <div className="flex items-center gap-4">
                            <div className="relative group">
                              <Avatar className="size-20 shrink-0">
                                <AvatarImage src={workspaceLogoPreview || workspaceLogoUrl || undefined} alt={workspaceName} />
                                <AvatarFallback className="text-2xl">
                                  {workspaceName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {(workspaceLogoPreview || workspaceLogoUrl) && (
                                <div 
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center cursor-pointer" 
                                  onClick={async () => {
                                    if (!workspace || !user?.id) return
                                    
                                    const result = await removeWorkspaceLogo(workspace.id, user.id)
                                    if ('error' in result) {
                                      toast.error(result.error)
                                    } else {
                                      // Workspace updated - refresh from context
                          refreshWorkspace()
                                      setWorkspaceLogoUrl('')
                                      setOriginalWorkspaceLogoUrl('')
                                      setWorkspaceLogoFile(null)
                                      setWorkspaceLogoPreview(null)
                                      if (workspaceLogoInputRef.current) {
                                        workspaceLogoInputRef.current.value = ''
                                      }
                                      await refreshWorkspace()
                                      toast.success('Logo removed successfully!')
                                    }
                                  }}
                                  title="Delete logo"
                                >
                                  <Trash2 className="size-6 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 w-full sm:w-64">
                              <Input
                                ref={workspaceLogoInputRef}
                                id="workspaceLogoFile-desktop"
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    // Validate file type (SVG excluded due to XSS risk from embedded JavaScript)
                                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
                                    if (!validTypes.includes(file.type)) {
                                      toast.error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.')
                                      return
                                    }

                                    // Validate file size (max 2MB)
                                    const maxSize = 2 * 1024 * 1024 // 2MB
                                    if (file.size > maxSize) {
                                      toast.error('File size too large. Maximum size is 2MB.')
                                      return
                                    }

                                    setWorkspaceLogoFile(file)

                                    // Create preview
                                    const reader = new FileReader()
                                    reader.onload = () => {
                                      setWorkspaceLogoPreview(reader.result as string)
                                    }
                                    reader.readAsDataURL(file)
                                  }
                                }}
                                className="w-full"
                                disabled={savingWorkspace}
                              />
                              <p className="text-xs text-muted-foreground">
                                Upload a JPEG, PNG, GIF, WebP, or SVG image (max 2MB)
                              </p>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Workspace Name */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <Label htmlFor="workspaceName-desktop" className="text-sm font-medium">Workspace name</Label>
                          <div className="flex items-center gap-3">
                            <Input 
                              id="workspaceName-desktop" 
                              value={workspaceName} 
                              onChange={(e) => setWorkspaceName(e.target.value)}
                              placeholder="Acme Real Estate" 
                              className="w-full sm:w-64"
                              disabled={savingWorkspace}
                            />
                          </div>
                        </div>

                        <Separator />

                        {/* Website */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <Label htmlFor="website-desktop" className="text-sm font-medium">Website</Label>
                          <div className="flex items-center gap-3">
                            <Input id="website-desktop" type="url" placeholder="https://example.com" className="w-full sm:w-64" />
                          </div>
                        </div>

                        <Separator />

                        {/* License */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <Label htmlFor="license-desktop" className="text-sm font-medium">License number</Label>
                          <div className="flex items-center gap-3">
                            <Input id="license-desktop" placeholder="DRE #01234567" className="w-full sm:w-64" />
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-start mt-10">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block">
                                <Button 
                                  type="submit"
                                  disabled={savingWorkspace || ((!workspaceName.trim() || workspaceName.trim() === originalWorkspaceName.trim()) && !workspaceLogoFile)}
                                >
                                  {savingWorkspace ? (
                                    <>
                                      <LottieSpinner size={16} className="mr-2" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="size-4 mr-2" />
                                      Save changes
                                    </>
                                  )}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!savingWorkspace && ((!workspaceName.trim() || workspaceName.trim() === originalWorkspaceName.trim()) && !workspaceLogoFile) && (
                              <TooltipContent>
                                <p>No changes to save</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>
                      </form>

                    </TabsContent>
                  )}
                </>
              )}

              {/* Notifications Tab */}
              {isMobile ? (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>
                      Configure how you receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>

                {/* Settings Fields */}
                <div className="space-y-4">
                  {/* Email Notifications */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive emails about site views and leads
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  {/* Weekly Reports */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Weekly reports</Label>
                      <p className="text-sm text-muted-foreground">
                        Get a weekly summary of your site performance
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  {/* Marketing Emails */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Marketing emails</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive tips and product updates
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
                  </CardContent>
                </Card>
              ) : (
                <TabsContent value="notifications" forceMount className="mt-0 sm:mt-6 space-y-6">
                  {/* Duplicate notifications content for desktop */}
                  <div>
                    <h2 className="text-lg font-semibold">Notifications</h2>
                    <p className="text-sm text-muted-foreground">
                      Configure how you receive notifications
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive emails about site views and leads
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Weekly reports</Label>
                        <p className="text-sm text-muted-foreground">
                          Get a weekly summary of your site performance
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Marketing emails</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive tips and product updates
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </TabsContent>
              )}

              {/* Domain Tab */}
              {isMobile ? (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Domain</CardTitle>
                    <CardDescription>
                      Configure your custom domain and branding settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Custom Domain */}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="custom-domain">Custom Domain</Label>
                        <div className="relative w-full sm:w-64">
                          <LottieLinkIconFocus className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                          <Input
                            id="custom-domain"
                            placeholder="yourdomain.com"
                            className="pl-9 w-full"
                            disabled={normalizePlan(workspace?.plan) !== 'growth'}
                          />
                        </div>
                      </div>
                      {normalizePlan(workspace?.plan) !== 'growth' && (
                        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <Globe className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                              <p className="text-sm text-green-900 dark:text-green-100">
                                Upgrade to Growth to add your custom domain
                              </p>
                            </div>
                            <PricingDialog currentPlan={workspace?.plan} stripeCustomerId={workspace?.stripe_customer_id}>
                              <span
                                className="text-sm font-medium text-green-700 dark:text-green-400 hover:underline shrink-0 cursor-pointer"
                              >
                                Upgrade
                              </span>
                            </PricingDialog>
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Powered by Ottie Branding */}
                      <div className="flex items-center justify-between">
                        <Label>Hide "Powered by Ottie"</Label>
                        <Switch
                          disabled={normalizePlan(workspace?.plan) === 'free'}
                        />
                      </div>
                      {normalizePlan(workspace?.plan) === 'free' && (
                        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                              <p className="text-sm text-green-900 dark:text-green-100">
                                This feature is available on our paid plans.
                              </p>
                            </div>
                            <PricingDialog currentPlan={workspace?.plan} stripeCustomerId={workspace?.stripe_customer_id}>
                              <span
                                className="text-sm font-medium text-green-700 dark:text-green-400 hover:underline shrink-0 cursor-pointer"
                              >
                                Upgrade
                              </span>
                            </PricingDialog>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <TabsContent value="domain" forceMount className="mt-0 sm:mt-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold">Domain</h2>
                    <p className="text-sm text-muted-foreground">
                      Configure your custom domain and branding settings
                    </p>
                  </div>
                  <div className="space-y-4">
                    {/* Custom Domain */}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="custom-domain">Custom Domain</Label>
                      <div className="relative w-full sm:w-64">
                        <LottieLinkIconFocus className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <Input
                          id="custom-domain"
                          placeholder="yourdomain.com"
                          className="pl-9 w-full"
                          disabled={normalizePlan(workspace?.plan) !== 'growth'}
                        />
                      </div>
                    </div>
                    {normalizePlan(workspace?.plan) !== 'growth' && (
                      <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <Globe className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                            <p className="text-sm text-green-900 dark:text-green-100">
                              Upgrade to Growth to add your custom domain
                            </p>
                          </div>
                          <PricingDialog currentPlan={workspace?.plan} stripeCustomerId={workspace?.stripe_customer_id}>
                            <span
                              className="text-sm font-medium text-green-700 dark:text-green-400 hover:underline shrink-0 cursor-pointer"
                            >
                              Upgrade
                            </span>
                          </PricingDialog>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Powered by Ottie Branding */}
                    <div className="flex items-center justify-between">
                      <Label>Hide "Powered by Ottie"</Label>
                      <Switch
                        disabled={normalizePlan(workspace?.plan) === 'free'}
                      />
                    </div>
                    {normalizePlan(workspace?.plan) === 'free' && (
                      <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                            <p className="text-sm text-green-900 dark:text-green-100">
                              This feature is available on our paid plans.
                            </p>
                          </div>
                          <PricingDialog currentPlan={workspace?.plan} stripeCustomerId={workspace?.stripe_customer_id}>
                            <span
                              className="text-sm font-medium text-green-700 dark:text-green-400 hover:underline shrink-0 cursor-pointer"
                            >
                              Upgrade
                            </span>
                          </PricingDialog>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {/* Billing Tab */}
              {showBillingTab && (
              (() => {
                const currentPlanId = workspace ? normalizePlan(workspace.plan) : 'free'
                const currentTier = pricingTiers.find(t => t.id === currentPlanId) || pricingTiers[0]
                const nextTierIndex = pricingTiers.findIndex(t => t.id === currentPlanId) + 1
                const nextTier = nextTierIndex < pricingTiers.length ? pricingTiers[nextTierIndex] : null
                const userCount = members.length || 1
                const planDescription = currentTier.description || (currentPlanId === 'free' ? 'Free for all users.' : '')
                const isHighestPlan = currentPlanId === 'agency' || currentPlanId === 'enterprise'

                return isMobile ? (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Billing</CardTitle>
                      <CardDescription>
                        For questions about billing,{' '}
                        <a href="mailto:support@getottie.com" className="underline hover:no-underline">
                          contact us
                        </a>
                      </CardDescription>
                      <CardAction>
                        <PricingDialog currentPlan={workspace?.plan} stripeCustomerId={workspace?.stripe_customer_id}>
                          <Button variant="ghost" size="sm" className="text-muted-foreground">
                            All plans <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </PricingDialog>
                      </CardAction>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Current Plan */}
                      <div className="rounded-lg border p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold capitalize">{currentTier.name} plan</span>
                              <Badge variant="secondary" className="text-xs">Current</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{planDescription}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Users</p>
                            <p className="text-lg font-semibold">{userCount}</p>
                          </div>
                        </div>
                      </div>

                      {/* Upgrade Section */}
                      {!isHighestPlan && nextTier ? (
                        <div className="rounded-lg border p-4 space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">Upgrade to {nextTier.name} plan</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                ${nextTier.monthlyPrice} per user/mo
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <PricingDialog currentPlan={workspace?.plan} stripeCustomerId={workspace?.stripe_customer_id}>
                                <Button variant="ghost" size="sm" className="text-muted-foreground">
                                  View all plans
                                </Button>
                              </PricingDialog>
                              <PricingDialog currentPlan={workspace?.plan} stripeCustomerId={workspace?.stripe_customer_id}>
                                <Button size="sm">Upgrade now</Button>
                              </PricingDialog>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {nextTier.features.slice(0, 6).map((feature, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <CheckIcon className="h-4 w-4 text-primary shrink-0" />
                                <span>{feature.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : isHighestPlan ? (
                        <div className="rounded-lg border p-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                            Need custom plan?
                  </p>
                          <Button variant="outline" className="w-full" asChild>
                            <a href="mailto:sales@getottie.com">Contact Sales</a>
                          </Button>
                </div>
                      ) : null}

                      {/* Manage Subscription */}
                      <div className="pt-4 border-t">
                        <h3 className="text-base font-semibold mb-2">Subscription</h3>
                        <a
                          href={workspace?.stripe_customer_id 
                            ? `https://billing.stripe.com/p/login/${workspace.stripe_customer_id}`
                            : 'https://dashboard.stripe.com'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Manage subscription <ExternalLink className="h-3 w-3" />
                        </a>
                  </div>
                    </CardContent>
                  </Card>
                ) : (
                  <TabsContent value="plan" forceMount className="mt-0 sm:mt-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">Billing</h2>
                        <p className="text-sm text-muted-foreground">
                          For questions about billing,{' '}
                          <a href="mailto:support@getottie.com" className="underline hover:no-underline">
                            contact us
                          </a>
                        </p>
                      </div>
                      <PricingDialog currentPlan={workspace?.plan} stripeCustomerId={workspace?.stripe_customer_id}>
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                          All plans <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </PricingDialog>
                </div>

                    {/* Current Plan */}
                    <div className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold capitalize">{currentTier.name} plan</span>
                            <Badge variant="secondary" className="text-xs">Current</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{planDescription}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Users</p>
                          <p className="text-lg font-semibold">{userCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Upgrade Section */}
                    {!isHighestPlan && nextTier ? (
                      <div className="rounded-lg border p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">Upgrade to {nextTier.name} plan</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              ${nextTier.monthlyPrice} per user/mo
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <PricingDialog currentPlan={workspace?.plan} stripeCustomerId={workspace?.stripe_customer_id}>
                              <Button variant="ghost" size="sm" className="text-muted-foreground">
                                View all plans
                              </Button>
                </PricingDialog>
                            <PricingDialog currentPlan={workspace?.plan} stripeCustomerId={workspace?.stripe_customer_id}>
                              <Button size="sm">Upgrade now</Button>
                            </PricingDialog>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          {nextTier.features.slice(0, 6).map((feature, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <CheckIcon className="h-4 w-4 text-primary shrink-0" />
                              <span>{feature.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : isHighestPlan ? (
                      <div className="rounded-lg border p-4 text-center space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Need custom plan?
                        </p>
                        <Button variant="outline" className="w-full" asChild>
                          <a href="mailto:sales@getottie.com">Contact Sales</a>
                        </Button>
                      </div>
                    ) : null}

                    {/* Manage Subscription */}
                    <div className="pt-4 border-t">
                      <h3 className="text-base font-semibold mb-2">Subscription</h3>
                      <a
                        href={workspace?.stripe_customer_id 
                          ? `https://billing.stripe.com/p/login/${workspace.stripe_customer_id}`
                          : 'https://dashboard.stripe.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Manage subscription <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
              </TabsContent>
                )
              })()
              )}

              {/* Team Tab */}
              {showTeamTab && (
              <>
              {isMobile ? (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Team</CardTitle>
                    <CardDescription>
                      Manage your workspace members and invitations
                    </CardDescription>
                    {workspace && isMultiUserPlan(workspace.plan) && isOwnerOrAdmin && (
                      <CardAction>
                        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                              Invite
                        </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Invite Team Member</DialogTitle>
                              <DialogDescription>
                                Send an invitation to join your workspace.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="invite-email-mobile">Email address</Label>
                                <Input
                                  id="invite-email-mobile"
                                  type="email"
                                  value={inviteEmail}
                                  onChange={(e) => setInviteEmail(e.target.value)}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="invite-role-mobile">Role</Label>
                                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'agent')}>
                                  <SelectTrigger id="invite-role-mobile" className="w-full">
                                    <SelectValue>
                                      <div className="flex items-center gap-2">
                                        {inviteRole === 'admin' && <Crown className="size-4 text-amber-500" />}
                                        <span className="capitalize">{inviteRole}</span>
                                      </div>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin" className="items-start py-2">
                                      <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                          <Crown className="size-4 text-amber-500" />
                                          <span className="font-medium">Admin</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground leading-tight">Can manage team and settings</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="agent" className="items-start py-2">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-medium">Agent</span>
                                        <span className="text-xs text-muted-foreground leading-tight">Can create and manage sites</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={async () => {
                                  if (!workspace || !user?.id) return
                                  if (!inviteEmail.trim()) {
                                    toast.error('Please enter an email address')
                                    return
                                  }
                                  
                                  setInviteLoading(true)
                                  const result = await createInvitation(
                                    workspace.id,
                                    user.id,
                                    inviteEmail.trim(),
                                    inviteRole
                                  )
                                  setInviteLoading(false)
                                  
                                  if ('error' in result) {
                                    toast.error(result.error)
                                  } else {
                                    toast.success(`Invitation sent to ${inviteEmail}`)
                                    setInviteDialogOpen(false)
                                    setInviteEmail('')
                                    setInviteRole('agent')
                                    refreshInvitations()
                                  }
                                }}
                                disabled={inviteLoading || !inviteEmail.trim()}
                                className="w-full"
                              >
                                {inviteLoading ? (
                                  <>
                                    <LottieSpinner size={16} className="mr-2" />
                                    Sending...
                                  </>
                                ) : (
                                  'Send Invitation'
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </CardAction>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Banner for single-user workspaces */}
                    {workspace && !isMultiUserPlan(workspace.plan) && (
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          Upgrade to invite team members
                        </p>
                        <p className="text-sm text-green-800 dark:text-green-200">
                          To invite users to your workspace, upgrade to the Agency or Enterprise plan.
                        </p>
                        <PricingDialog 
                          currentPlan={workspace?.plan} 
                          stripeCustomerId={workspace?.stripe_customer_id}
                          defaultSelectedTier="agency"
                        >
                          <Button size="sm" className="mt-2 bg-green-600 hover:bg-green-700 text-white">
                            Upgrade Plan
                          </Button>
                        </PricingDialog>
                </div>
                    </div>
                  </div>
                )}

                {/* Members List */}
                <div>
                      <h3 className="text-sm font-medium mb-3">Members</h3>
                  {membersLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-48" />
                            </div>
                          </div>
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : members.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No members found
                    </div>
                  ) : (
                        <div className="space-y-3">
                        {members.map(({ membership, profile }) => (
                            <div key={membership.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={profile.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {profile.full_name
                                      ? profile.full_name
                                          .split(' ')
                                          .map(n => n[0])
                                          .join('')
                                          .toUpperCase()
                                          .slice(0, 2)
                                      : profile.email?.[0]?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {profile.full_name || profile.email || 'Unknown User'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {profile.email}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="capitalize">
                                {membership.role}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Pending Invitations */}
                    {workspace && isMultiUserPlan(workspace.plan) && isOwnerOrAdmin && (
                      <div>
                        <h3 className="text-sm font-medium mb-3">Pending Invitations</h3>
                        {invitationsLoading ? (
                          <div className="space-y-3">
                            {[1, 2].map((i) => (
                              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-40" />
                                  <Skeleton className="h-3 w-32" />
                                </div>
                                <div className="flex gap-1">
                                  <Skeleton className="h-8 w-8 rounded-md" />
                                  <Skeleton className="h-8 w-8 rounded-md" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : invitations.length === 0 ? (
                          <div className="p-6 text-center text-sm text-muted-foreground border rounded-lg">
                            No pending invitations
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {invitations.map((invitation) => {
                              const expiresAt = new Date(invitation.expires_at)
                              const now = new Date()
                              const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                              
                              return (
                                <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <p className="font-medium text-sm">{invitation.email}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {invitation.role} • Expires in {daysLeft} day{daysLeft === 1 ? '' : 's'}
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={async () => {
                                        if (!workspace || !user?.id) return
                                        const result = await resendInvitation(invitation.id, workspace.id, user.id)
                                      if ('error' in result) {
                                        toast.error(result.error)
                                      } else {
                                          toast.success('Invitation resent')
                                          refreshInvitations()
                                      }
                                    }}
                                  >
                                      <RotateCw className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive"
                                      onClick={async () => {
                                        if (!workspace || !user?.id) return
                                        const result = await cancelInvitation(invitation.id, workspace.id, user.id)
                                        if ('error' in result) {
                                          toast.error(result.error)
                                        } else {
                                          toast.success('Invitation cancelled')
                                          refreshInvitations()
                                        }
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                              </div>
                                </div>
                              )
                            })}
                          </div>
                  )}
                </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <TabsContent value="team" forceMount className="mt-0 sm:mt-6 space-y-6">
                  {/* Header with Invite Button */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Team
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Manage your workspace members and invitations
                      </p>
                    </div>
                    {workspace && isMultiUserPlan(workspace.plan) && isOwnerOrAdmin && (
                      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Invite User
                    </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Invite Team Member</DialogTitle>
                            <DialogDescription>
                              Send an invitation to join your workspace. They will receive an email with a link to accept.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="invite-email">Email address</Label>
                              <Input
                                id="invite-email"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="invite-role">Role</Label>
                              <RoleSelect
                                value={inviteRole}
                                onValueChange={(v) => setInviteRole(v)}
                                triggerClassName="w-full"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setInviteDialogOpen(false)
                                setInviteEmail('')
                                setInviteRole('agent')
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={async () => {
                                if (!workspace || !user?.id) return
                                if (!inviteEmail.trim()) {
                                  toast.error('Please enter an email address')
                                  return
                                }
                                
                                setInviteLoading(true)
                                const result = await createInvitation(
                                  workspace.id,
                                  user.id,
                                  inviteEmail.trim(),
                                  inviteRole
                                )
                                setInviteLoading(false)
                                
                                if ('error' in result) {
                                  toast.error(result.error)
                                } else {
                                  toast.success(`Invitation sent to ${inviteEmail}`)
                                  setInviteDialogOpen(false)
                                  setInviteEmail('')
                                  setInviteRole('agent')
                                  refreshInvitations()
                                }
                              }}
                              disabled={inviteLoading || !inviteEmail.trim()}
                            >
                              {inviteLoading ? (
                                <>
                                  <LottieSpinner size={16} className="mr-2" />
                                  Sending...
                                </>
                              ) : (
                                'Send Invitation'
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  {/* Upgrade Banner for single-user plans */}
                  {workspace && !isMultiUserPlan(workspace.plan) && (
                    <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">
                            Upgrade to invite team members
                          </p>
                          <p className="text-sm text-green-800 dark:text-green-200">
                            To invite users to your workspace, upgrade to the Agency or Enterprise plan.
                          </p>
                          <PricingDialog 
                            currentPlan={workspace?.plan} 
                            stripeCustomerId={workspace?.stripe_customer_id}
                            defaultSelectedTier="agency"
                          >
                            <Button size="sm" className="mt-2 bg-green-600 hover:bg-green-700 text-white">
                              Upgrade Plan
                            </Button>
                          </PricingDialog>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Members Table */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Members</h3>
                    {membersLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-48" />
                              </div>
                            </div>
                            <Skeleton className="h-6 w-16 rounded-full" />
                          </div>
                        ))}
                      </div>
                    ) : members.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        No members found
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-4 font-medium text-sm">Member</th>
                            <th className="text-right p-4 font-medium text-sm">Role</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map(({ membership, profile }) => (
                            <tr key={membership.id} className="border-b">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={profile.avatar_url || undefined} />
                                    <AvatarFallback>
                                      {profile.full_name
                                        ? profile.full_name
                                            .split(' ')
                                            .map(n => n[0])
                                            .join('')
                                            .toUpperCase()
                                            .slice(0, 2)
                                        : profile.email?.[0]?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {profile.full_name || profile.email || 'Unknown User'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {profile.email}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-end gap-2">
                                  {isOwnerOrAdmin && membership.role !== 'owner' && membership.user_id !== user?.id ? (
                                    <RoleSelect
                                      value={membership.role as 'admin' | 'agent'}
                                      loading={updatingRoleId === membership.id}
                                      onValueChange={async (value) => {
                                        if (!workspace || !user?.id) return

                                        setUpdatingRoleId(membership.id)
                                        
                                        const result = await updateMembershipRole(
                                          membership.id,
                                          workspace.id,
                                          user.id,
                                          value
                                        )

                                        if ('error' in result) {
                                          toast.error(result.error)
                                          setUpdatingRoleId(null)
                                        } else {
                                          toast.success('Role updated successfully')
                                          // Invalidate queries to refresh data without page reload
                                          await queryClient.invalidateQueries({ queryKey: ['workspaceMembers', workspace.id] })
                                          await queryClient.invalidateQueries({ queryKey: ['appData'] })
                                          setUpdatingRoleId(null)
                                        }
                                      }}
                                    />
                                  ) : (
                                    <Badge variant="secondary" className="capitalize flex items-center gap-1.5">
                                      {membership.role === 'admin' && <Crown className="size-3 text-amber-500" />}
                                      {membership.role}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                </div>

                  {/* Pending Invitations */}
                  {workspace && isMultiUserPlan(workspace.plan) && isOwnerOrAdmin && (
                    <div>
                      <h3 className="text-sm font-medium mb-3">Pending Invitations</h3>
                      {invitationsLoading ? (
                        <div className="space-y-3">
                          {[1, 2].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-32" />
                              </div>
                              <div className="flex gap-1">
                                <Skeleton className="h-8 w-8 rounded-md" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : invitations.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground border rounded-lg">
                          No pending invitations
                        </div>
                      ) : (
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-4 font-medium text-sm">Email</th>
                              <th className="text-left p-4 font-medium text-sm">Role</th>
                              <th className="text-left p-4 font-medium text-sm">Expires</th>
                              <th className="text-right p-4 font-medium text-sm">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invitations.map((invitation) => {
                              const expiresAt = new Date(invitation.expires_at)
                              const now = new Date()
                              const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                              const isExpiringSoon = daysLeft <= 2
                              
                              return (
                                <tr key={invitation.id} className="border-b">
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">{invitation.email}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          Invited {new Date(invitation.created_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <Badge variant="outline" className="capitalize">
                                      {invitation.role}
                                    </Badge>
                                  </td>
                                  <td className="p-4">
                                    <span className={`text-sm ${isExpiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                                      {daysLeft > 0 ? `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'Expired'}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center justify-end gap-2">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={async () => {
                                              if (!workspace || !user?.id) return
                                              const result = await resendInvitation(
                                                invitation.id,
                                                workspace.id,
                                                user.id
                                              )
                                              if ('error' in result) {
                                                toast.error(result.error)
                                              } else {
                                                toast.success('Invitation resent')
                                                refreshInvitations()
                                              }
                                            }}
                                          >
                                            <RotateCw className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Resend invitation</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={async () => {
                                              if (!workspace || !user?.id) return
                                              const result = await cancelInvitation(
                                                invitation.id,
                                                workspace.id,
                                                user.id
                                              )
                                              if ('error' in result) {
                                                toast.error(result.error)
                                              } else {
                                                toast.success('Invitation cancelled')
                                                refreshInvitations()
                                              }
                                            }}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Cancel invitation</TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
              </TabsContent>
              )}
              </>
              )}

              {/* Data Tab */}
              {isMobile ? (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Data</CardTitle>
                    <CardDescription>
                      Manage your account and workspace data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Delete Account Section */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Delete Account</p>
                        <p className="text-xs text-muted-foreground">
                          Permanently delete your account and all data
                        </p>
                      </div>
                      <Button 
                        variant="link" 
                        size="sm"
                        onClick={async () => {
                          if (!user?.id) return
                          
                          setDeleteLoading(true)
                          const checkResult = await checkWorkspacesForDeletion(user.id)
                          setWorkspacesToDelete(checkResult.workspaces)
                          setHasMultiUserWorkspace(checkResult.hasMultiUserWorkspace)
                          setDeleteLoading(false)
                          setShowDeleteDialog(true)
                        }}
                        disabled={deleteLoading || !user?.id}
                        className="w-fit h-auto p-0 text-destructive hover:text-destructive/80 sm:ml-auto"
                      >
                        {deleteLoading ? (
                          <>
                            <LottieSpinner size={16} className="mr-2" />
                            Checking...
                          </>
                        ) : (
                          'Delete account'
                        )}
                      </Button>
                    </div>

                    {/* Delete Workspace Section - Only visible to owners */}
                    {showWorkspaceSettings && membership?.role === 'owner' && (
                      <>
                        <Separator className="my-6" />
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Delete Workspace</p>
                            <p className="text-xs text-muted-foreground">
                              Delete workspace will permanently delete all sites, integrations, and logo. A new workspace will be created automatically.
                            </p>
                          </div>
                          <Button 
                            variant="link" 
                            size="sm"
                            onClick={async () => {
                              if (!workspace || !user?.id) return
                              
                              const confirmed = window.confirm(
                                `Are you sure you want to delete "${workspace.name}"? This will permanently delete all sites, integrations, and remove the logo. A new workspace will be created automatically. This action cannot be undone.`
                              )
                              
                              if (!confirmed) return
                              
                              setResetWorkspaceLoading(true)
                              const result = await resetWorkspace(workspace.id, user.id)
                              
                              if ('error' in result) {
                                toast.error(result.error)
                              } else {
                                toast.success('Workspace deleted and new workspace created successfully')
                                // Refresh workspace data - this will load the new workspace
                                await refreshWorkspace()
                                // Reset local state
                                setWorkspaceLogoUrl('')
                                setOriginalWorkspaceLogoUrl('')
                                setWorkspaceLogoFile(null)
                                setWorkspaceLogoPreview(null)
                                if (workspaceLogoInputRef.current) {
                                  workspaceLogoInputRef.current.value = ''
                                }
                                // Reload page to ensure all components use the new workspace
                                window.location.reload()
                              }
                              
                              setResetWorkspaceLoading(false)
                            }}
                            disabled={resetWorkspaceLoading || !user?.id}
                            className="w-fit h-auto p-0 text-destructive hover:text-destructive/80 sm:ml-auto"
                          >
                            {resetWorkspaceLoading ? (
                              <>
                                <LottieSpinner size={16} className="mr-2" />
                                Deleting...
                              </>
                            ) : (
                              'Delete workspace'
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <TabsContent value="data" forceMount className="mt-0 sm:mt-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold">Data</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage your account and workspace data
                    </p>
                  </div>
                  
                  {/* Delete Account Section */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Delete Account</p>
                      <p className="text-xs text-muted-foreground">
                        Permanently delete your account and all data
                      </p>
                    </div>
                    <Button 
                      variant="link" 
                      size="sm"
                      onClick={async () => {
                        if (!user?.id) return
                        
                        setDeleteLoading(true)
                        const checkResult = await checkWorkspacesForDeletion(user.id)
                        setWorkspacesToDelete(checkResult.workspaces)
                        setHasMultiUserWorkspace(checkResult.hasMultiUserWorkspace)
                        setDeleteLoading(false)
                        setShowDeleteDialog(true)
                      }}
                      disabled={deleteLoading || !user?.id}
                      className="w-fit h-auto p-0 text-destructive hover:text-destructive/80 sm:ml-auto"
                    >
                      {deleteLoading ? (
                        <>
                          <LottieSpinner size={16} className="mr-2" />
                          Checking...
                        </>
                      ) : (
                        'Delete account'
                      )}
                    </Button>
                  </div>

                  {/* Delete Workspace Section - Only visible to owners */}
                  {showWorkspaceSettings && membership?.role === 'owner' && (
                    <>
                      <Separator className="my-6" />
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Delete Workspace</p>
                          <p className="text-xs text-muted-foreground">
                            Delete workspace will permanently delete all sites, integrations, and logo. A new workspace will be created automatically.
                          </p>
                        </div>
                        <Button 
                          variant="link" 
                          size="sm"
                          onClick={async () => {
                            if (!workspace || !user?.id) return
                            
                            const confirmed = window.confirm(
                              `Are you sure you want to delete "${workspace.name}"? This will permanently delete all sites, integrations, and remove the logo. A new workspace will be created automatically. This action cannot be undone.`
                            )
                            
                            if (!confirmed) return
                            
                            setResetWorkspaceLoading(true)
                            const result = await resetWorkspace(workspace.id, user.id)
                            
                            if ('error' in result) {
                              toast.error(result.error)
                            } else {
                              toast.success('Workspace deleted and new workspace created successfully')
                              // Refresh workspace data - this will load the new workspace
                              await refreshWorkspace()
                              // Reset local state
                              setWorkspaceLogoUrl('')
                              setOriginalWorkspaceLogoUrl('')
                              setWorkspaceLogoFile(null)
                              setWorkspaceLogoPreview(null)
                              if (workspaceLogoInputRef.current) {
                                workspaceLogoInputRef.current.value = ''
                              }
                              // Reload page to ensure all components use the new workspace
                              window.location.reload()
                            }
                            
                            setResetWorkspaceLoading(false)
                          }}
                          disabled={resetWorkspaceLoading || !user?.id}
                          className="w-fit h-auto p-0 text-destructive hover:text-destructive/80 sm:ml-auto"
                        >
                          {resetWorkspaceLoading ? (
                            <>
                              <LottieSpinner size={16} className="mr-2" />
                              Deleting...
                            </>
                          ) : (
                            'Delete workspace'
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>
              )}

              {/* Integrations Tab */}
              {isMobile ? (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Integrations</CardTitle>
                    <CardDescription>
                      Connect your Ottie account with other apps and services
                    </CardDescription>
                    <CardAction>
                      <Button variant="outline" size="sm" onClick={openUserJot} className="gap-2">
                        <Plus className="size-4" />
                        Request integration
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="space-y-8 pb-8">
                    {/* CRM Sync Section */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-base font-semibold">CRM Sync</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Sync your leads and contacts with your CRM platform
                        </p>
                      </div>
                      <div className="space-y-3">
                        {/* HubSpot */}
                        <div className="rounded-lg border p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                              <svg className="size-6" viewBox="0 0 22 26" fill="none">
                                <path fillRule="evenodd" clipRule="evenodd" d="M16.79 6.7V9.37c2.45.37 4.4 2.21 4.9 4.6.5 2.4-.56 4.85-2.65 6.15-2.1 1.3-4.79 1.18-6.76-.3l-2.2 2.17c.06.18.09.36.09.55 0 1.05-.86 1.9-1.93 1.9s-1.93-.85-1.93-1.9c0-1.06.86-1.91 1.93-1.91.19 0 .37.03.55.09l2.22-2.2c-1.4-1.97-1.44-4.59-.09-6.6L3.62 6.31c-.98.56-2.22.35-2.96-.49-.75-.84-.79-2.08-.1-2.97.69-.88 1.92-1.16 2.93-.67 1.01.49 1.53 1.63 1.24 2.7l7.43 5.72c.81-.64 1.78-1.07 2.81-1.22V6.7c-.73-.34-1.2-1.06-1.2-1.86v-.06c0-1.14.93-2.06 2.08-2.06h.06c1.15 0 2.08.92 2.08 2.06v.06c0 .8-.47 1.52-1.2 1.86zm-3.95 8.46c0 1.66 1.36 3.01 3.04 3.01 1.68 0 3.04-1.35 3.04-3.01 0-1.66-1.36-3.01-3.04-3.01-1.68 0-3.04 1.35-3.04 3.01z" fill="#FF4800"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-sm">HubSpot</p>
                              <p className="text-xs text-muted-foreground">Sync leads and contacts</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="gap-2">
                            Connect
                            <ExternalLink className="size-3" />
                          </Button>
                        </div>

                        {/* Zoho */}
                        <div className="rounded-lg border p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                              <svg className="size-6" viewBox="0 0 182 62">
                                <path fill="#089949" d="M81.1 62c-1.4 0-2.8-.3-4.1-.9L48.2 48.3c-5.2-2.3-7.5-8.3-5.2-13.5L55.8 6.1c2.3-5.1 8.3-7.5 13.5-5.2l28.8 12.8c5.1 2.3 7.5 8.3 5.2 13.5L90.4 56c-1.7 3.8-5.4 6-9.3 6zm-1.8-6.3c2.2 1 4.7 0 5.7-2.2l12.8-28.8c1-2.2 0-4.7-2.2-5.7L66.9 6.3c-2.2-1-4.7 0-5.7 2.2L48.4 37.2c-1 2.2 0 4.7 2.2 5.7l28.7 12.8z"/>
                                <path fill="#F9B21D" d="M171.3 62h-31.5c-5.6 0-10.2-4.6-10.2-10.2V20.3c0-5.6 4.6-10.2 10.2-10.2h31.5c5.6 0 10.2 4.6 10.2 10.2v31.5c0 5.6-4.6 10.2-10.2 10.2zm-31.5-46c-2.4 0-4.3 1.9-4.3 4.3v31.5c0 2.4 1.9 4.3 4.3 4.3h31.5c2.4 0 4.3-1.9 4.3-4.3V20.3c0-2.4-1.9-4.3-4.3-4.3h-31.5z"/>
                                <path fill="#E42527" d="M53.3 26.1l-4.2 9.5-.2.3 1.7 10.2c.4 2.4-1.2 4.6-3.6 4.9l-31.1 5c-1.1.2-2.3-.1-3.2-.8-.9-.7-1.5-1.7-1.7-2.8l-5-31.1c-.2-1.1.1-2.3.8-3.2.7-.9 1.7-1.5 2.8-1.7l31.1-5c.2 0 .5-.1.7-.1 2.1 0 3.9 1.5 4.3 3.6l1.7 10.3 4.4-9.8-.2-1.4c-.9-5.6-6.1-9.4-11.7-8.5l-31.1 5c-2.7.4-5.1 1.9-6.6 4.1-1.6 2.2-2.2 4.9-1.8 7.6l5 31.1c.4 2.7 1.9 5.1 4.1 6.7 1.7 1.3 3.8 1.9 6 1.9.5 0 1.1 0 1.7-.1l31.1-5c5.6-.9 9.4-6.1 8.5-11.7l-4.5-17.6z"/>
                                <path fill="#226DB4" d="M90.6 40.9l4.6-10.2-1.3-9.5c-.2-1.1.1-2.3.8-3.2.7-.9 1.7-1.5 2.9-1.7l31.2-4.2c.2 0 .4 0 .6 0 .9 0 1.8.3 2.6.9.1.1.3.2.4.3 1.4-1.5 3.2-2.5 5.2-2.9-.6-.8-1.3-1.5-2.1-2.1-2.2-1.7-4.9-2.4-7.6-2l-31.3 4.2c-2.7.4-5.1 1.8-6.7 3.9-1.7 2.2-2.4 4.9-2 7.6l2.7 18.9zM143.8 46.2L139.7 16c-2.3.1-4.2 2-4.2 4.3v8.9l2.4 17.8c.2 1.1-.1 2.3-.8 3.2s-1.7 1.5-2.9 1.7L103 56.1c-1.1.2-2.3-.1-3.2-.8-.9-.7-1.5-1.7-1.7-2.9l-1.4-10.6L92.2 52l.2 1.2c.4 2.7 1.8 5.1 3.9 6.7 1.8 1.4 3.9 2.1 6.2 2.1.5 0 .9 0 1.4-.1l31.2-4.2c2.7-.4 5.1-1.8 6.7-3.9 1.6-2.2 2.3-4.9 2-7.6z"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-sm">Zoho</p>
                              <p className="text-xs text-muted-foreground">Sync leads and contacts</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="gap-2">
                            Connect
                            <ExternalLink className="size-3" />
                          </Button>
                        </div>

                        {/* Pipedrive */}
                        <div className="rounded-lg border p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                              <svg
                                className="text-[#26292C] dark:text-white w-6 h-6"
                                viewBox="0 0 170 215"
                                fill="currentColor"
                                preserveAspectRatio="xMidYMid meet"
                              >
                                <path d="M59.68 81.18c0 20.36 10.33 42.32 33.05 42.32 16.86 0 33.9-13.16 33.9-42.62 0-25.83-13.4-43.17-33.33-43.17-16.25 0-33.62 11.41-33.62 43.47zm41.62-81.18c40.75 0 68.15 32.27 68.15 80.31 0 47.29-28.86 80.3-70.12 80.3-19.67 0-32.27-8.43-38.86-14.53.05 1.45.08 3.07.08 4.8v64.12H18.33V44.16c0-2.48-.8-3.27-3.26-3.27H.55V3.47h35.42c16.31 0 20.48 8.3 21.28 14.7 6.62-7.42 20.34-18.17 44.05-18.17z"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-sm">Pipedrive</p>
                              <p className="text-xs text-muted-foreground">Sync leads and contacts</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="gap-2">
                            Connect
                            <ExternalLink className="size-3" />
                          </Button>
                        </div>

                        {/* Salesforce */}
                        <div className="rounded-lg border p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                              <svg className="size-6" viewBox="0 0 274 191" fill="none">
                                <path d="M113.26 21.28c8.78-9.15 21-14.82 34.51-14.82 17.97 0 33.64 10.02 41.99 24.89a58 58 0 0123.73-5.05c32.4 0 58.67 26.5 58.67 59.19s-26.27 59.19-58.67 59.19c-3.96 0-7.82-.4-11.56-1.15-7.35 13.11-21.36 21.97-37.44 21.97a42.67 42.67 0 01-18.76-4.32c-7.45 17.53-24.81 29.82-45.05 29.82-21.07 0-39.03-13.33-45.92-32.03a45.12 45.12 0 01-9.34.97C20.34 159.94 0 139.39 0 114.04c0-16.99 9.14-31.82 22.72-39.76a52.55 52.55 0 01-4.35-20.99C18.37 24.14 42.03.5 71.23.5c17.14 0 32.37 8.15 42.03 20.78" fill="#00A1E0"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-sm">Salesforce</p>
                              <p className="text-xs text-muted-foreground">Sync leads and contacts</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="gap-2">
                            Connect
                            <ExternalLink className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Automation Section */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-base font-semibold">Automation</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Automate workflows and connect with thousands of apps
                        </p>
                      </div>
                      <div className="space-y-3">
                        {/* Zapier */}
                        <div className="rounded-lg border p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border relative overflow-hidden">
                              <svg className="size-5" viewBox="0 0 24 24">
                                <path fill="#FF4A00" d="M12 0l6.7 6.7h-4.8v4.8h4.8l-6.7 6.7-6.7-6.7h4.8V6.7H5.3L12 0z"/>
                                <path fill="#FF4A00" d="M12 24l-6.7-6.7h4.8v-4.8H5.3l6.7-6.7 6.7 6.7h-4.8v4.8h4.8L12 24z"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-sm">Zapier</p>
                              <p className="text-xs text-muted-foreground">Automate workflows and integrations</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="gap-2">
                            Connect
                            <ExternalLink className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Communication Section */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-base font-semibold">Communication</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Connect with communication tools to send messages and notifications
                        </p>
                      </div>
                      <div className="space-y-3">
                        {/* Slack */}
                        <div className="rounded-lg border p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                              <svg className="size-6" viewBox="0 0 24 24" fill="none">
                                <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313z" fill="#E01E5A"/>
                                <path d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z" fill="#36C5F0"/>
                                <path d="M18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.522 2.521 2.528 2.528 0 01-2.52-2.521V2.522A2.528 2.528 0 0115.165 0a2.528 2.528 0 012.521 2.522v6.312z" fill="#2EB67D"/>
                                <path d="M15.165 18.956a2.528 2.528 0 012.521 2.522A2.528 2.528 0 0115.165 24a2.528 2.528 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.528 2.528 0 01-2.52-2.522 2.528 2.528 0 012.52-2.52h6.313A2.528 2.528 0 0124 15.165a2.528 2.528 0 01-2.522 2.521h-6.313z" fill="#ECB22E"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-sm">Slack</p>
                              <p className="text-xs text-muted-foreground">Get notifications and updates</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="gap-2">
                            Connect
                            <ExternalLink className="size-3" />
                          </Button>
                        </div>

                        {/* WhatsApp */}
                        <div className="rounded-lg border p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                              <svg className="size-6" viewBox="0 0 24 24" fill="#25d366">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-sm">WhatsApp</p>
                              <p className="text-xs text-muted-foreground">Send messages and notifications</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="gap-2">
                            Connect
                            <ExternalLink className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Calendar Section */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-base font-semibold">Calendar</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Sync and schedule appointments with calendar tools
                        </p>
                      </div>
                      <div className="space-y-3">
                        {/* Google Calendar */}
                        <div className="rounded-lg border p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                              <svg className="size-6" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-sm">Google Calendar</p>
                              <p className="text-xs text-muted-foreground">Sync appointments and events</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="gap-2">
                            Connect
                            <ExternalLink className="size-3" />
                          </Button>
                        </div>

                        {/* Calendly */}
                        <div className="rounded-lg border p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                              <svg className="size-6" viewBox="0 0 526 536" fill="none">
                                <path d="M360.4 347.4c-17 15.09-38.21 33.87-76.78 33.87h-23c-27.88 0-53.23-10.12-71.37-28.49-17.72-17.94-27.48-42.5-27.48-69.16v-31.51c0-26.66 9.76-51.22 27.48-69.16 18.14-18.37 43.49-28.49 71.37-28.49h23c38.57 0 59.76 18.78 76.78 33.87 17.65 15.65 32.9 29.16 73.52 29.16 5.96 0 12.26-.49 18.5-1.48-.04-.12-.08-.23-.13-.35a139.23 139.23 0 00-8.55-17.55l-27.16-47.05A139.53 139.53 0 00295.76 81.3h-54.33a139.53 139.53 0 00-120.82 69.76l-27.16 47.05a139.52 139.52 0 000 139.51l27.16 47.05a139.52 139.52 0 00120.82 69.75h54.33a139.52 139.52 0 00120.82-69.75l27.16-47.05a139.23 139.23 0 008.55-17.55c.04-.12.09-.23.13-.35-6.24-.99-12.54-1.48-18.5-1.48-40.62 0-55.87 13.51-73.52 29.16z" fill="#006BFF"/>
                                <path d="M283.62 183h-23c-42.42 0-70.3 30.3-70.3 69.09v31.51c0 38.79 27.88 69.09 70.3 69.09h23c61.82 0 57-63 150.3-63 8.9 0 17.69.81 26.37 2.41a139.36 139.36 0 000-48.46 143.32 143.32 0 01-26.37 2.42c-93.33 0-88.48-63.06-150.3-63.06z" fill="#006BFF"/>
                                <path d="M452.42 216a116.05 116.05 0 01-18.5 1.48c-40.62 0-55.87-13.51-73.52-29.16-17-15.09-38.21-33.87-76.78-33.87h-23c-27.88 0-53.23 10.12-71.37 28.49-17.72 17.94-27.48 42.5-27.48 69.16v31.51c0 26.66 9.76 51.22 27.48 69.16 18.14 18.37 43.49 28.49 71.37 28.49h23c38.57 0 59.76-18.78 76.78-33.87 17.65-15.65 32.9-29.16 73.52-29.16 6.24 0 12.54.49 18.5 1.48a138.46 138.46 0 007.79-27.16c.02-.15.06-.31.08-.47a144.19 144.19 0 00-26.37-2.41c-93.33 0-88.48 63-150.3 63h-23c-42.42 0-70.3-30.3-70.3-69.09v-31.51c0-38.79 27.88-69.09 70.3-69.09h23c61.82 0 57 63 150.3 63 8.9 0 17.69-.81 26.37-2.42-.02-.14-.04-.29-.07-.44a139.36 139.36 0 00-7.8-27.18z" fill="#0AE8EF"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-sm">Calendly</p>
                              <p className="text-xs text-muted-foreground">Schedule meetings and appointments</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="gap-2">
                            Connect
                            <ExternalLink className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <TabsContent value="integrations" forceMount className="mt-0 sm:mt-6 space-y-8 pb-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold">Integrations</h2>
                      <p className="text-sm text-muted-foreground">
                        Connect your Ottie account with other apps and services
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={openUserJot} className="shrink-0 gap-2">
                      <Plus className="h-4 w-4" />
                      Request integration
                    </Button>
                  </div>

                  {/* CRM Sync Section */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-semibold">CRM Sync</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Sync your leads and contacts with your CRM platform
                      </p>
                    </div>
                    <div className="space-y-3">
                      {/* HubSpot */}
                      <div className="rounded-lg border p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                            <svg className="size-6" viewBox="0 0 22 26" fill="none">
                              <path fillRule="evenodd" clipRule="evenodd" d="M16.79 6.7V9.37c2.45.37 4.4 2.21 4.9 4.6.5 2.4-.56 4.85-2.65 6.15-2.1 1.3-4.79 1.18-6.76-.3l-2.2 2.17c.06.18.09.36.09.55 0 1.05-.86 1.9-1.93 1.9s-1.93-.85-1.93-1.9c0-1.06.86-1.91 1.93-1.91.19 0 .37.03.55.09l2.22-2.2c-1.4-1.97-1.44-4.59-.09-6.6L3.62 6.31c-.98.56-2.22.35-2.96-.49-.75-.84-.79-2.08-.1-2.97.69-.88 1.92-1.16 2.93-.67 1.01.49 1.53 1.63 1.24 2.7l7.43 5.72c.81-.64 1.78-1.07 2.81-1.22V6.7c-.73-.34-1.2-1.06-1.2-1.86v-.06c0-1.14.93-2.06 2.08-2.06h.06c1.15 0 2.08.92 2.08 2.06v.06c0 .8-.47 1.52-1.2 1.86zm-3.95 8.46c0 1.66 1.36 3.01 3.04 3.01 1.68 0 3.04-1.35 3.04-3.01 0-1.66-1.36-3.01-3.04-3.01-1.68 0-3.04 1.35-3.04 3.01z" fill="#FF4800"/>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-sm">HubSpot</p>
                            <p className="text-xs text-muted-foreground">Sync leads and contacts</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2">
                          Connect
                          <ExternalLink className="size-3" />
                        </Button>
                      </div>

                      {/* Zoho */}
                      <div className="rounded-lg border p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                            <svg className="size-6" viewBox="0 0 182 62">
                              <path fill="#089949" d="M81.1 62c-1.4 0-2.8-.3-4.1-.9L48.2 48.3c-5.2-2.3-7.5-8.3-5.2-13.5L55.8 6.1c2.3-5.1 8.3-7.5 13.5-5.2l28.8 12.8c5.1 2.3 7.5 8.3 5.2 13.5L90.4 56c-1.7 3.8-5.4 6-9.3 6zm-1.8-6.3c2.2 1 4.7 0 5.7-2.2l12.8-28.8c1-2.2 0-4.7-2.2-5.7L66.9 6.3c-2.2-1-4.7 0-5.7 2.2L48.4 37.2c-1 2.2 0 4.7 2.2 5.7l28.7 12.8z"/>
                              <path fill="#F9B21D" d="M171.3 62h-31.5c-5.6 0-10.2-4.6-10.2-10.2V20.3c0-5.6 4.6-10.2 10.2-10.2h31.5c5.6 0 10.2 4.6 10.2 10.2v31.5c0 5.6-4.6 10.2-10.2 10.2zm-31.5-46c-2.4 0-4.3 1.9-4.3 4.3v31.5c0 2.4 1.9 4.3 4.3 4.3h31.5c2.4 0 4.3-1.9 4.3-4.3V20.3c0-2.4-1.9-4.3-4.3-4.3h-31.5z"/>
                              <path fill="#E42527" d="M53.3 26.1l-4.2 9.5-.2.3 1.7 10.2c.4 2.4-1.2 4.6-3.6 4.9l-31.1 5c-1.1.2-2.3-.1-3.2-.8-.9-.7-1.5-1.7-1.7-2.8l-5-31.1c-.2-1.1.1-2.3.8-3.2.7-.9 1.7-1.5 2.8-1.7l31.1-5c.2 0 .5-.1.7-.1 2.1 0 3.9 1.5 4.3 3.6l1.7 10.3 4.4-9.8-.2-1.4c-.9-5.6-6.1-9.4-11.7-8.5l-31.1 5c-2.7.4-5.1 1.9-6.6 4.1-1.6 2.2-2.2 4.9-1.8 7.6l5 31.1c.4 2.7 1.9 5.1 4.1 6.7 1.7 1.3 3.8 1.9 6 1.9.5 0 1.1 0 1.7-.1l31.1-5c5.6-.9 9.4-6.1 8.5-11.7l-4.5-17.6z"/>
                              <path fill="#226DB4" d="M90.6 40.9l4.6-10.2-1.3-9.5c-.2-1.1.1-2.3.8-3.2.7-.9 1.7-1.5 2.9-1.7l31.2-4.2c.2 0 .4 0 .6 0 .9 0 1.8.3 2.6.9.1.1.3.2.4.3 1.4-1.5 3.2-2.5 5.2-2.9-.6-.8-1.3-1.5-2.1-2.1-2.2-1.7-4.9-2.4-7.6-2l-31.3 4.2c-2.7.4-5.1 1.8-6.7 3.9-1.7 2.2-2.4 4.9-2 7.6l2.7 18.9zM143.8 46.2L139.7 16c-2.3.1-4.2 2-4.2 4.3v8.9l2.4 17.8c.2 1.1-.1 2.3-.8 3.2s-1.7 1.5-2.9 1.7L103 56.1c-1.1.2-2.3-.1-3.2-.8-.9-.7-1.5-1.7-1.7-2.9l-1.4-10.6L92.2 52l.2 1.2c.4 2.7 1.8 5.1 3.9 6.7 1.8 1.4 3.9 2.1 6.2 2.1.5 0 .9 0 1.4-.1l31.2-4.2c2.7-.4 5.1-1.8 6.7-3.9 1.6-2.2 2.3-4.9 2-7.6z"/>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Zoho</p>
                            <p className="text-xs text-muted-foreground">Sync leads and contacts</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2">
                          Connect
                          <ExternalLink className="size-3" />
                        </Button>
                      </div>

                      {/* Pipedrive */}
                      <div className="rounded-lg border p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                            <svg
                              className="text-[#26292C] dark:text-white w-6 h-6"
                              viewBox="0 0 170 215"
                              fill="currentColor"
                              preserveAspectRatio="xMidYMid meet"
                            >
                              <path d="M59.68 81.18c0 20.36 10.33 42.32 33.05 42.32 16.86 0 33.9-13.16 33.9-42.62 0-25.83-13.4-43.17-33.33-43.17-16.25 0-33.62 11.41-33.62 43.47zm41.62-81.18c40.75 0 68.15 32.27 68.15 80.31 0 47.29-28.86 80.3-70.12 80.3-19.67 0-32.27-8.43-38.86-14.53.05 1.45.08 3.07.08 4.8v64.12H18.33V44.16c0-2.48-.8-3.27-3.26-3.27H.55V3.47h35.42c16.31 0 20.48 8.3 21.28 14.7 6.62-7.42 20.34-18.17 44.05-18.17z"/>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Pipedrive</p>
                            <p className="text-xs text-muted-foreground">Sync leads and contacts</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2">
                          Connect
                          <ExternalLink className="size-3" />
                        </Button>
                      </div>

                      {/* Salesforce */}
                      <div className="rounded-lg border p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                            <svg className="size-6" viewBox="0 0 274 191" fill="none">
                              <path d="M113.26 21.28c8.78-9.15 21-14.82 34.51-14.82 17.97 0 33.64 10.02 41.99 24.89a58 58 0 0123.73-5.05c32.4 0 58.67 26.5 58.67 59.19s-26.27 59.19-58.67 59.19c-3.96 0-7.82-.4-11.56-1.15-7.35 13.11-21.36 21.97-37.44 21.97a42.67 42.67 0 01-18.76-4.32c-7.45 17.53-24.81 29.82-45.05 29.82-21.07 0-39.03-13.33-45.92-32.03a45.12 45.12 0 01-9.34.97C20.34 159.94 0 139.39 0 114.04c0-16.99 9.14-31.82 22.72-39.76a52.55 52.55 0 01-4.35-20.99C18.37 24.14 42.03.5 71.23.5c17.14 0 32.37 8.15 42.03 20.78" fill="#00A1E0"/>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Salesforce</p>
                            <p className="text-xs text-muted-foreground">Sync leads and contacts</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2">
                          Connect
                          <ExternalLink className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Automation Section */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-semibold">Automation</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Automate workflows and connect with thousands of apps
                      </p>
                    </div>
                    <div className="space-y-3">
                      {/* Zapier */}
                      <div className="rounded-lg border p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border relative overflow-hidden">
                            <svg className="size-5" viewBox="0 0 24 24">
                              <path fill="#FF4A00" d="M12 0l6.7 6.7h-4.8v4.8h4.8l-6.7 6.7-6.7-6.7h4.8V6.7H5.3L12 0z"/>
                              <path fill="#FF4A00" d="M12 24l-6.7-6.7h4.8v-4.8H5.3l6.7-6.7 6.7 6.7h-4.8v4.8h4.8L12 24z"/>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Zapier</p>
                            <p className="text-xs text-muted-foreground">Automate workflows and integrations</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2">
                          Connect
                          <ExternalLink className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Communication Section */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-semibold">Communication</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Connect with communication tools to send messages and notifications
                      </p>
                    </div>
                    <div className="space-y-3">
                      {/* Slack */}
                      <div className="rounded-lg border p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                            <svg className="size-6" viewBox="0 0 24 24" fill="none">
                              <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313z" fill="#E01E5A"/>
                              <path d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z" fill="#36C5F0"/>
                              <path d="M18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.522 2.521 2.528 2.528 0 01-2.52-2.521V2.522A2.528 2.528 0 0115.165 0a2.528 2.528 0 012.521 2.522v6.312z" fill="#2EB67D"/>
                              <path d="M15.165 18.956a2.528 2.528 0 012.521 2.522A2.528 2.528 0 0115.165 24a2.528 2.528 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.528 2.528 0 01-2.52-2.522 2.528 2.528 0 012.52-2.52h6.313A2.528 2.528 0 0124 15.165a2.528 2.528 0 01-2.522 2.521h-6.313z" fill="#ECB22E"/>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Slack</p>
                            <p className="text-xs text-muted-foreground">Get notifications and updates</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2">
                          Connect
                          <ExternalLink className="size-3" />
                        </Button>
                      </div>

                      {/* WhatsApp */}
                      <div className="rounded-lg border p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                            <svg className="size-6" viewBox="0 0 24 24" fill="#25d366">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-sm">WhatsApp</p>
                            <p className="text-xs text-muted-foreground">Send messages and notifications</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2">
                          Connect
                          <ExternalLink className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Calendar Section */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-semibold">Calendar</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Sync and schedule appointments with calendar tools
                      </p>
                    </div>
                    <div className="space-y-3">
                      {/* Google Calendar */}
                      <div className="rounded-lg border p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                            <svg className="size-6" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Google Calendar</p>
                            <p className="text-xs text-muted-foreground">Sync appointments and events</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2">
                          Connect
                          <ExternalLink className="size-3" />
                        </Button>
                      </div>

                      {/* Calendly */}
                      <div className="rounded-lg border p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center border">
                            <svg className="size-6" viewBox="0 0 526 536" fill="none">
                              <path d="M360.4 347.4c-17 15.09-38.21 33.87-76.78 33.87h-23c-27.88 0-53.23-10.12-71.37-28.49-17.72-17.94-27.48-42.5-27.48-69.16v-31.51c0-26.66 9.76-51.22 27.48-69.16 18.14-18.37 43.49-28.49 71.37-28.49h23c38.57 0 59.76 18.78 76.78 33.87 17.65 15.65 32.9 29.16 73.52 29.16 5.96 0 12.26-.49 18.5-1.48-.04-.12-.08-.23-.13-.35a139.23 139.23 0 00-8.55-17.55l-27.16-47.05A139.53 139.53 0 00295.76 81.3h-54.33a139.53 139.53 0 00-120.82 69.76l-27.16 47.05a139.52 139.52 0 000 139.51l27.16 47.05a139.52 139.52 0 00120.82 69.75h54.33a139.52 139.52 0 00120.82-69.75l27.16-47.05a139.23 139.23 0 008.55-17.55c.04-.12.09-.23.13-.35-6.24-.99-12.54-1.48-18.5-1.48-40.62 0-55.87 13.51-73.52 29.16z" fill="#006BFF"/>
                              <path d="M283.62 183h-23c-42.42 0-70.3 30.3-70.3 69.09v31.51c0 38.79 27.88 69.09 70.3 69.09h23c61.82 0 57-63 150.3-63 8.9 0 17.69.81 26.37 2.41a139.36 139.36 0 000-48.46 143.32 143.32 0 01-26.37 2.42c-93.33 0-88.48-63.06-150.3-63.06z" fill="#006BFF"/>
                              <path d="M452.42 216a116.05 116.05 0 01-18.5 1.48c-40.62 0-55.87-13.51-73.52-29.16-17-15.09-38.21-33.87-76.78-33.87h-23c-27.88 0-53.23 10.12-71.37 28.49-17.72 17.94-27.48 42.5-27.48 69.16v31.51c0 26.66 9.76 51.22 27.48 69.16 18.14 18.37 43.49 28.49 71.37 28.49h23c38.57 0 59.76-18.78 76.78-33.87 17.65-15.65 32.9-29.16 73.52-29.16 6.24 0 12.54.49 18.5 1.48a138.46 138.46 0 007.79-27.16c.02-.15.06-.31.08-.47a144.19 144.19 0 00-26.37-2.41c-93.33 0-88.48 63-150.3 63h-23c-42.42 0-70.3-30.3-70.3-69.09v-31.51c0-38.79 27.88-69.09 70.3-69.09h23c61.82 0 57 63 150.3 63 8.9 0 17.69-.81 26.37-2.42-.02-.14-.04-.29-.07-.44a139.36 139.36 0 00-7.8-27.18z" fill="#0AE8EF"/>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Calendly</p>
                            <p className="text-xs text-muted-foreground">Schedule meetings and appointments</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2">
                          Connect
                          <ExternalLink className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}
              </div>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save them before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscard}>
              Discard Changes
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAndContinue} disabled={saving}>
              {saving ? (
                <>
                  <LottieSpinner size={16} className="mr-2" />
                  Saving...
                </>
              ) : (
                'Save & Continue'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your account? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 mt-4">
            {workspacesToDelete.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-foreground text-sm">
                  The following workspaces will also be deleted:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {workspacesToDelete.map((ws) => (
                    <li key={ws.id}>
                      <span className="font-medium text-foreground">{ws.name}</span>
                      {ws.memberCount > 1 && (
                        <span className="text-muted-foreground">
                          {' '}({ws.memberCount} members - all data will be lost)
                        </span>
                      )}
                      {ws.memberCount === 1 && (
                        <span className="text-muted-foreground">
                          {' '}(only you)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {hasMultiUserWorkspace && (
                  <p className="text-sm text-destructive font-medium mt-2">
                    ⚠️ Warning: Some workspaces have multiple members. All their data will be permanently deleted.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This will permanently delete:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                <li>Your profile and account</li>
                <li>All workspaces where you are the owner</li>
                <li>All sites associated with your workspaces</li>
                <li>All integrations associated with your workspaces</li>
                <li>All your memberships</li>
                <li>All avatars you uploaded</li>
                {hasMultiUserWorkspace && (
                  <li className="text-destructive font-medium">
                    All data in workspaces with multiple members
                  </li>
                )}
              </ul>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!user?.id) return

                setDeleteLoading(true)
                setError(null)

                const result = await deleteUserAccount(user.id)

                if ('error' in result) {
                  setError(result.error)
                  toast.error(result.error)
                  setDeleteLoading(false)
                  setShowDeleteDialog(false)
                } else {
                  // Sign out and redirect to login
                  try {
                    await signOutAuth()
                  } catch (signOutError) {
                    // Continue even if sign out fails - account is already deleted
                    console.error('Error signing out:', signOutError)
                  }
                  router.push('/login')
                  router.refresh()
                }
              }}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? (
                <>
                  <LottieSpinner size={16} className="mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

