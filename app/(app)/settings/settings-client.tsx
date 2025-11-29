'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
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
import { PricingDialog } from '@/components/workspace/pricing-dialog'
import { updateUserProfile, getCurrentUserProfile, removeAvatar } from './actions'
import { useUserProfile } from '@/contexts/user-profile-context'
import type { Profile } from '@/types/database'

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
}

export function SettingsClient({ user: serverUser, initialProfile, userMetadata }: SettingsClientProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { user: clientUser } = useAuth()
  const { refresh: refreshUserProfile } = useUserProfile()
  
  // Use client-side user if available (more reliable), otherwise fall back to server user
  const user = clientUser || serverUser
  
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(!initialProfile && !!clientUser?.id)

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
    }
  }, [hasUnsavedChanges])

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
      setError('User not authenticated. Please refresh the page.')
      return
    }

    if (!confirm('Are you sure you want to remove your avatar?')) {
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    const result = await removeAvatar(user.id)

    if (result.error) {
      setError(result.error)
    } else if (result.success && result.profile) {
      setProfile(result.profile)
      setAvatarUrl('')
      setOriginalAvatarUrl('')
      setAvatarFile(null)
      setAvatarPreview(null)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      // Refresh user profile in all components
      refreshUserProfile()
      setSuccess(true)
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
      setError('User not authenticated. Please refresh the page.')
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
      // Show warning if avatar upload failed but profile was saved
      if ('warning' in result && result.warning) {
        setError(result.warning)
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
        setError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.')
        return
      }

      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024 // 2MB
      if (file.size > maxSize) {
        setError('File size too large. Maximum size is 2MB.')
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
          <p className="text-xs text-muted-foreground">View and manage your workspace settings.</p>
        </div>
      </header>

      {/* Main Content with Top Tabs */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
          {/* Content - scrollable and centered */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="max-w-4xl mx-auto">
              {/* Top Tabs - aligned with content */}
              <div className="px-6 pt-6">
                <TabsList>
                  <TabsTrigger value="profile">Account</TabsTrigger>
                  <TabsTrigger value="company">Company</TabsTrigger>
                  <TabsTrigger value="appearance">Appearance</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="plan">Plan & Billing</TabsTrigger>
                  <TabsTrigger value="danger" className="text-destructive data-[state=active]:text-destructive">
                    Danger Zone
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
              {/* Account Tab */}
              <TabsContent value="profile" className="mt-6 space-y-6">
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
                <form id="profile-form" onSubmit={handleSaveProfile} className="space-y-4">
                  {/* Error/Success Messages */}
                  {error && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                      Profile updated successfully!
                    </div>
                  )}

                {/* Avatar */}
                <div className="flex items-start justify-between">
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
                    <div className="flex flex-col gap-2 w-64">
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
                <div className="flex items-center justify-between">
                    <Label htmlFor="fullName" className="text-sm font-medium">Full name</Label>
                  <div className="flex items-center gap-3">
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-64"
                      />
                  </div>
                </div>

                <Separator />

                  {/* Email (Read-only) */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                        <Input
                          id="email"
                          type="email"
                          value={userEmail}
                          disabled
                          className="w-64 bg-muted"
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
                    <Button type="submit" disabled={saving}>
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
              </div>
                </form>
                )}
              </TabsContent>

              {/* Company Tab */}
              <TabsContent value="company" className="mt-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Company</h2>
                  <p className="text-sm text-muted-foreground">
                    Your company information for branding
                  </p>
                </div>

                {/* Settings Fields */}
                <div className="space-y-4">
                  {/* Company Name */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="companyName" className="text-sm font-medium">Company name</Label>
                    <div className="flex items-center gap-3">
                      <Input id="companyName" placeholder="Acme Real Estate" className="w-64" />
                    </div>
                  </div>

                  <Separator />

                  {/* Website */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="website" className="text-sm font-medium">Website</Label>
                    <div className="flex items-center gap-3">
                      <Input id="website" type="url" placeholder="https://example.com" className="w-64" />
                    </div>
                  </div>

                  <Separator />

                  {/* License */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="license" className="text-sm font-medium">License number</Label>
                    <div className="flex items-center gap-3">
                      <Input id="license" placeholder="DRE #01234567" className="w-64" />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-start">
                  <Button>
                    <Check className="size-4 mr-2" />
                    Save changes
                  </Button>
                </div>
              </TabsContent>

              {/* Appearance Tab */}
              <TabsContent value="appearance" className="mt-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Appearance</h2>
                  <p className="text-sm text-muted-foreground">
                    Customize how Ottie looks on your device
                  </p>
                </div>

                {/* Settings Fields */}
                <div className="space-y-4">
                  {/* Theme */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="theme" className="text-sm font-medium">Theme</Label>
                    <div className="flex items-center gap-3">
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
                </div>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="mt-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Notifications</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure how you receive notifications
                  </p>
                </div>

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
              </TabsContent>

              {/* Plan & Billing Tab */}
              <TabsContent value="plan" className="mt-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    Current Plan
                    <Badge variant="secondary">Free</Badge>
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage your subscription and billing
                  </p>
                </div>

                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Free Plan</span>
                    <span className="text-muted-foreground">$0/month</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Up to 3 sites</li>
                    <li>• Basic analytics</li>
                    <li>• Ottie branding</li>
                  </ul>
                </div>

                <PricingDialog>
                  <Button className="w-full">Upgrade to Pro</Button>
                </PricingDialog>
              </TabsContent>

              {/* Danger Zone Tab */}
              <TabsContent value="danger" className="mt-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
                  <p className="text-sm text-muted-foreground">
                    Irreversible actions for your account
                  </p>
                </div>

                {/* Settings Fields */}
                <div className="space-y-4">
                  {/* Delete Account */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="font-medium">Delete account</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all data
                      </p>
                    </div>
                    <Button variant="destructive" size="sm">
                      Delete account
                    </Button>
                  </div>
                </div>
              </TabsContent>
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
    </div>
  )
}

