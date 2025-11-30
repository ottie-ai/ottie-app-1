'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { Sun, Moon, Monitor, Check, Loader2, AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { updateUserProfile, getCurrentUserProfile, removeAvatar, checkWorkspacesForDeletion, deleteUserAccount, updateWorkspaceName, uploadWorkspaceLogo, removeWorkspaceLogo, updateWorkspaceAction, updateMembershipRole, resetWorkspace } from './actions'
import { useUserProfile } from '@/contexts/user-profile-context'
import { isMultiUserPlan, normalizePlan } from '@/lib/utils'
import { signOut as signOutAuth } from '@/lib/supabase/auth'
import { useWorkspaceMembers } from '@/hooks/use-workspace-members'
import { useWorkspace } from '@/contexts/workspace-context'
import type { Profile, Workspace, Membership } from '@/types/database'
import { pricingTiers } from '@/lib/pricing-data'
import { Mail, Plus, AlertCircle, ArrowRight, Check as CheckIcon, ExternalLink } from 'lucide-react'
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
  initialProfile: Profile | null
  userMetadata: {
    fullName: string
    avatarUrl: string
    email: string
    isGoogleSignIn: boolean
  }
  initialWorkspace: Workspace | null
  initialMembership: Membership | null
}

export function SettingsClient({ user: serverUser, initialProfile, userMetadata, initialWorkspace, initialMembership }: SettingsClientProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { user: clientUser } = useAuth()
  const { refresh: refreshUserProfile } = useUserProfile()
  
  // Use client-side user if available (more reliable), otherwise fall back to server user
  const user = clientUser || serverUser
  
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'profile'
  const [activeTab, setActiveTab] = useState(initialTab)
  
  // Update active tab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab') || 'profile'
    setActiveTab(tab)
  }, [searchParams])
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [workspace, setWorkspace] = useState<Workspace | null>(initialWorkspace)
  const [workspaceName, setWorkspaceName] = useState(initialWorkspace?.name || '')
  const [originalWorkspaceName, setOriginalWorkspaceName] = useState(initialWorkspace?.name || '')
  const [workspaceLogoFile, setWorkspaceLogoFile] = useState<File | null>(null)
  const [workspaceLogoPreview, setWorkspaceLogoPreview] = useState<string | null>(null)
  const [workspaceLogoUrl, setWorkspaceLogoUrl] = useState(initialWorkspace?.logo_url || '')
  const [originalWorkspaceLogoUrl, setOriginalWorkspaceLogoUrl] = useState(initialWorkspace?.logo_url || '')
  const workspaceLogoInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [savingWorkspace, setSavingWorkspace] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(!initialProfile && !!clientUser?.id)
  
  // Get workspace refresh function from hook
  const { refresh: refreshWorkspace } = useWorkspace()
  
  // Check if workspace settings should be shown (only for multi-user plans and owner/admin role)
  const isOwnerOrAdmin = initialMembership?.role === 'owner' || initialMembership?.role === 'admin'
  const showWorkspaceSettings = workspace && isMultiUserPlan(workspace.plan) && isOwnerOrAdmin
  
  // Load workspace members
  const { members, loading: membersLoading } = useWorkspaceMembers(workspace?.id || null)
  
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

  // Delete account dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [workspacesToDelete, setWorkspacesToDelete] = useState<Array<{ id: string; name: string; memberCount: number }>>([])
  const [hasMultiUserWorkspace, setHasMultiUserWorkspace] = useState(false)

  // Reset workspace state
  const [resetWorkspaceLoading, setResetWorkspaceLoading] = useState(false)

  // Form state - initialize from server data
  // IMPORTANT: Only use profile.avatar_url, never userMetadata.avatarUrl (which may contain Google avatar)
  const [fullName, setFullName] = useState(
    initialProfile?.full_name || userMetadata.fullName
  )
  const [avatarUrl, setAvatarUrl] = useState(
    initialProfile?.avatar_url || '' // Only use profile avatar, never Google avatar fallback
  )
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initialProfileRef = useRef(initialProfile)

  // Original values to track changes
  // IMPORTANT: Only use profile.avatar_url, never userMetadata.avatarUrl
  const [originalFullName, setOriginalFullName] = useState(
    initialProfile?.full_name || userMetadata.fullName
  )
  const [originalAvatarUrl, setOriginalAvatarUrl] = useState(
    initialProfile?.avatar_url || '' // Only use profile avatar, never Google avatar fallback
  )

  // Load profile from client-side if server-side data is not available
  // This happens when server-side session is not synced with client-side session
  useEffect(() => {
    async function loadProfileFromClient() {
      // Only load if we don't have initial profile but have a user
      if (!initialProfile && clientUser?.id) {
        setLoading(true)
        try {
          const data = await getCurrentUserProfile(clientUser.id)
          if (data) {
            setProfile(data)
            const name = data.full_name || clientUser.user_metadata?.full_name || ''
            const avatar = data.avatar_url || '' // ONLY use profile avatar, never Google avatar
            setFullName(name)
            setAvatarUrl(avatar)
            setOriginalFullName(name)
            setOriginalAvatarUrl(avatar)
          } else {
            // Use user metadata as fallback for name only, never for avatar
            const name = clientUser.user_metadata?.full_name || ''
            const avatar = '' // Never use Google avatar, only profile avatar
            setFullName(name)
            setAvatarUrl(avatar)
            setOriginalFullName(name)
            setOriginalAvatarUrl(avatar)
          }
        } catch (e) {
          console.error('Error loading profile:', e)
        }
        setLoading(false)
      }
    }

    loadProfileFromClient()
  }, [initialProfile, clientUser?.id])

  // Track the last synced values to detect when profile data changes
  const lastSyncedValues = useRef<{ name: string; avatar: string } | null>(null)
  
  // Update original values when profile data changes (after save or refresh)
  // This ensures original values always match the saved server data
  useEffect(() => {
    // Use profile state if available (updated after save), otherwise use initialProfile
    const currentProfile = profile || initialProfile
    
    if (currentProfile) {
      const name = currentProfile.full_name || userMetadata.fullName || ''
      const avatar = currentProfile.avatar_url || '' // ONLY use profile avatar, never Google avatar
      
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
    } else if (!currentProfile && userMetadata) {
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
  }, [profile?.full_name, profile?.avatar_url, initialProfile?.full_name, initialProfile?.avatar_url, avatarFile, userMetadata.fullName])

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
  const handleTabChange = useCallback((newTab: string) => {
    if (hasUnsavedChanges()) {
      setPendingTab(newTab)
      setShowUnsavedDialog(true)
    } else {
      setActiveTab(newTab)
      // Update URL with tab parameter
      router.push(`/settings${newTab !== 'profile' ? `?tab=${newTab}` : ''}`)
    }
  }, [hasUnsavedChanges, router])

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
      setProfile(result.profile)
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

  // Get user data for display
  const userName = userMetadata.fullName || user.email?.split('@')[0] || 'User'
  const userEmail = userMetadata.email
  // Always use profile.avatar_url from database (profile always exists)
  const userAvatar = profile?.avatar_url || ''
  // Use preview if available, otherwise use profile avatar directly (updates immediately after delete)
  const displayAvatar = avatarPreview || (profile?.avatar_url !== undefined ? (profile.avatar_url || '') : userAvatar)

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
        setProfile(refreshedProfile)
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
      setProfile(result.profile)
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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
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
                  <TabsTrigger value="team">Team</TabsTrigger>
                  <TabsTrigger value="appearance">Appearance</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="plan">Plan & Billing</TabsTrigger>
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

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                <form id="profile-form" onSubmit={handleSaveProfile} className="space-y-4">

                {/* Avatar */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <Label htmlFor="avatar" className="text-sm font-medium pt-2">Avatar</Label>
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
                        id="avatarFile"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleFileChange}
                        className="w-full cursor-pointer"
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

              {/* Save Button */}
              <div className="flex justify-start">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button 
                        type="submit" 
                        disabled={saving || (fullName.trim() === originalFullName.trim() && !avatarFile && avatarUrl === originalAvatarUrl)}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="size-4 mr-2 animate-spin" />
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

                {/* Delete Account Section */}
                <Separator className="my-6" />
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Danger Zone</p>
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
                    className="w-fit h-auto p-0 text-destructive hover:text-destructive/80"
                  >
                    {deleteLoading ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      'Delete account'
                    )}
                  </Button>
                </div>
                  </CardContent>
                </Card>
              ) : (
                <TabsContent value="profile" className="mt-0 sm:mt-6 space-y-6">
                  {/* Duplicate content for desktop - same as mobile */}
                  <div>
                    <h2 className="text-lg font-semibold">Account</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage your personal information and preferences
                    </p>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                              className="w-full cursor-pointer"
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

                      {/* Save Button */}
                      <div className="flex justify-start">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-block">
                              <Button 
                                type="submit" 
                                disabled={saving || (fullName.trim() === originalFullName.trim() && !avatarFile && avatarUrl === originalAvatarUrl)}
                              >
                                {saving ? (
                                  <>
                                    <Loader2 className="size-4 mr-2 animate-spin" />
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

                  {/* Delete Account Section */}
                  <Separator className="my-6" />
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Danger Zone</p>
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
                      className="w-fit h-auto p-0 text-destructive hover:text-destructive/80"
                    >
                      {deleteLoading ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        'Delete account'
                      )}
                    </Button>
                  </div>
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
                          setWorkspace(result.workspace)
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
                          setWorkspace(result.workspace)
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
                                  setWorkspace(result.workspace)
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
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                // Validate file type
                                const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
                                if (!validTypes.includes(file.type)) {
                                  toast.error('Invalid file type. Please upload a JPEG, PNG, GIF, WebP, or SVG image.')
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
                            className="w-full cursor-pointer"
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
                    <div className="flex justify-start">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            <Button 
                              type="submit"
                              disabled={savingWorkspace || ((!workspaceName.trim() || workspaceName.trim() === originalWorkspaceName.trim()) && !workspaceLogoFile)}
                            >
                              {savingWorkspace ? (
                                <>
                                  <Loader2 className="size-4 mr-2 animate-spin" />
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

                  {/* Danger Zone Section - Only visible to owners */}
                  {initialMembership?.role === 'owner' && (
                    <>
                      <Separator className="my-6" />
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Danger Zone</p>
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
                          className="w-fit h-auto p-0 text-destructive hover:text-destructive/80"
                        >
                          {resetWorkspaceLoading ? (
                            <>
                              <Loader2 className="size-4 mr-2 animate-spin" />
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
                    <TabsContent value="workspace" className="mt-0 sm:mt-6 space-y-6">
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
                              setWorkspace(result.workspace)
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
                              setWorkspace(result.workspace)
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
                                      setWorkspace(result.workspace)
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
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    // Validate file type
                                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
                                    if (!validTypes.includes(file.type)) {
                                      toast.error('Invalid file type. Please upload a JPEG, PNG, GIF, WebP, or SVG image.')
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
                                className="w-full cursor-pointer"
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
                        <div className="flex justify-start">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block">
                                <Button 
                                  type="submit"
                                  disabled={savingWorkspace || ((!workspaceName.trim() || workspaceName.trim() === originalWorkspaceName.trim()) && !workspaceLogoFile)}
                                >
                                  {savingWorkspace ? (
                                    <>
                                      <Loader2 className="size-4 mr-2 animate-spin" />
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

                      {/* Danger Zone Section - Only visible to owners */}
                      {initialMembership?.role === 'owner' && (
                        <>
                          <Separator className="my-6" />
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Danger Zone</p>
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
                              className="w-fit h-auto p-0 text-destructive hover:text-destructive/80"
                            >
                              {resetWorkspaceLoading ? (
                                <>
                                  <Loader2 className="size-4 mr-2 animate-spin" />
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
                </>
              )}

              {/* Appearance Tab */}
              {isMobile ? (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>
                      Customize how Ottie looks on your device
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Settings Fields */}
                    <div className="space-y-4">
                      {/* Theme */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <Label htmlFor="theme" className="text-sm font-medium">Theme</Label>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant={theme === 'light' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setTheme('light')}
                              className="gap-2"
                            >
                              <Sun className="size-4" />
                              Light
                            </Button>
                            <Button
                              variant={theme === 'dark' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setTheme('dark')}
                              className="gap-2"
                            >
                              <Moon className="size-4" />
                              Dark
                            </Button>
                            <Button
                              variant={theme === 'system' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setTheme('system')}
                              className="gap-2"
                            >
                              <Monitor className="size-4" />
                              System
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <TabsContent value="appearance" className="mt-0 sm:mt-6 space-y-6">
                  {/* Duplicate appearance content for desktop */}
                  <div>
                    <h2 className="text-lg font-semibold">Appearance</h2>
                    <p className="text-sm text-muted-foreground">
                      Customize how Ottie looks on your device
                    </p>
                  </div>
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Theme</Label>
                          <p className="text-sm text-muted-foreground">
                            Choose your preferred theme
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={theme === 'light' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTheme('light')}
                          className="gap-2"
                        >
                          <Sun className="size-4" />
                          Light
                        </Button>
                        <Button
                          variant={theme === 'dark' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTheme('dark')}
                          className="gap-2"
                        >
                          <Moon className="size-4" />
                          Dark
                        </Button>
                        <Button
                          variant={theme === 'system' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTheme('system')}
                          className="gap-2"
                        >
                          <Monitor className="size-4" />
                          System
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
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
                <TabsContent value="notifications" className="mt-0 sm:mt-6 space-y-6">
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

              {/* Plan & Billing Tab */}
              {(() => {
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
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>Billing</CardTitle>
                          <CardDescription>
                            For questions about billing,{' '}
                            <a href="mailto:support@getottie.com" className="underline hover:no-underline">
                              contact us
                            </a>
                          </CardDescription>
                        </div>
                        <PricingDialog currentPlan={workspace?.plan} stripeCustomerId={workspace?.stripe_customer_id}>
                          <Button variant="ghost" size="sm" className="text-muted-foreground">
                            All plans <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </PricingDialog>
                      </div>
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
                  <TabsContent value="plan" className="mt-0 sm:mt-6 space-y-6">
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
              })()}

              {/* Team Tab */}
              {isMobile ? (
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <CardTitle>Team</CardTitle>
                        <CardDescription>
                          Manage your workspace members and invitations
                        </CardDescription>
                      </div>
                      {workspace && isMultiUserPlan(workspace.plan) && isOwnerOrAdmin && (
                        <Button size="sm" variant="outline" disabled>
                          <Plus className="h-4 w-4 mr-2" />
                          Invite User
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
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
                  {membersLoading ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      Loading members...
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
                                  <Select
                                    value={membership.role}
                                    onValueChange={async (value: UserRole) => {
                                      if (!workspace || !user?.id) return
                                      
                                      if (value === 'owner') {
                                        toast.error('Cannot change role to owner')
                                        return
                                      }

                                      const result = await updateMembershipRole(
                                        membership.id,
                                        workspace.id,
                                        user.id,
                                        value as 'admin' | 'agent'
                                      )

                                      if ('error' in result) {
                                        toast.error(result.error)
                                      } else {
                                        toast.success('Role updated successfully')
                                        // Refresh members list
                                        window.location.reload()
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="agent">Agent</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge variant="secondary" className="capitalize">
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
                  </CardContent>
                </Card>
              ) : (
                <TabsContent value="team" className="mt-0 sm:mt-6 space-y-6">
                  {/* Team content is already duplicated above in the mobile section */}
                  {/* For desktop, we'll use the same content but wrapped in TabsContent */}
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
                      <Button size="sm" variant="outline" disabled>
                        <Plus className="h-4 w-4 mr-2" />
                        Invite User
                      </Button>
                    )}
                  </div>
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
                  <div>
                    {membersLoading ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        Loading members...
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
                                    <Select
                                      value={membership.role}
                                      onValueChange={async (value: UserRole) => {
                                        if (!workspace || !user?.id) return
                                        
                                        if (value === 'owner') {
                                          toast.error('Cannot change role to owner')
                                          return
                                        }

                                        const result = await updateMembershipRole(
                                          membership.id,
                                          workspace.id,
                                          user.id,
                                          value as 'admin' | 'agent'
                                        )

                                        if ('error' in result) {
                                          toast.error(result.error)
                                        } else {
                                          toast.success('Role updated successfully')
                                          window.location.reload()
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="agent">Agent</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Badge variant="secondary" className="capitalize">
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

