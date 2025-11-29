'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { Sun, Moon, Monitor, Info, Check, Star, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
import { getCurrentUserProfile, updateUserProfile } from './actions'
import type { Profile } from '@/types/database'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  // Original values to track changes
  const [originalFullName, setOriginalFullName] = useState('')
  const [originalAvatarUrl, setOriginalAvatarUrl] = useState('')

  // Unsaved changes dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingTab, setPendingTab] = useState<string | null>(null)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Track if profile has been loaded to prevent reloading on tab switch
  const hasLoadedRef = useRef<string | null>(null)

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return fullName !== originalFullName || avatarUrl !== originalAvatarUrl
  }, [fullName, avatarUrl, originalFullName, originalAvatarUrl])

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

  // Load profile data - only once per user
  useEffect(() => {
    async function loadProfile() {
      if (!user) {
        // Reset when user logs out
        hasLoadedRef.current = null
        setProfile(null)
        return
      }

      // Don't reload if already loaded for this user
      if (hasLoadedRef.current === user.id) return
      
      hasLoadedRef.current = user.id
      setLoading(true)
      const data = await getCurrentUserProfile(user.id)
      if (data) {
        setProfile(data)
        const name = data.full_name || ''
        const avatar = data.avatar_url || ''
        setFullName(name)
        setAvatarUrl(avatar)
        // Set original values to track changes
        setOriginalFullName(name)
        setOriginalAvatarUrl(avatar)
      } else {
        // Profile might not exist yet - use user metadata as fallback
        const name = user.user_metadata?.full_name || ''
        const avatar = user.user_metadata?.avatar_url || ''
        setFullName(name)
        setAvatarUrl(avatar)
        setOriginalFullName(name)
        setOriginalAvatarUrl(avatar)
      }
      setLoading(false)
    }

    loadProfile()
  }, [user])

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
    if (!user) return
    
    // Trigger form submission
    const formData = new FormData()
    formData.append('fullName', fullName)
    if (avatarUrl) {
      formData.append('avatarUrl', avatarUrl)
    }
    
    setSaving(true)
    const result = await updateUserProfile(user.id, formData)
    setSaving(false)
    
    if (result.success && result.profile) {
      setProfile(result.profile)
      setOriginalFullName(fullName)
      setOriginalAvatarUrl(avatarUrl)
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
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const userEmail = user?.email || ''
  const userAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
  
  // Check if user is signed in via Google OAuth
  const isGoogleSignIn = user?.app_metadata?.provider === 'google' || 
                         user?.identities?.some((identity: any) => identity.provider === 'google') ||
                         false

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
    if (!user) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.append('fullName', fullName)
    if (avatarUrl) {
      formData.append('avatarUrl', avatarUrl)
    }

    const result = await updateUserProfile(user.id, formData)

    if (result.error) {
      setError(result.error)
    } else if (result.success && result.profile) {
      setProfile(result.profile)
      // Update original values after successful save
      setOriginalFullName(fullName)
      setOriginalAvatarUrl(avatarUrl)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }

    setSaving(false)
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
                  <TabsTrigger value="profile">Profile</TabsTrigger>
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
              {/* Profile Tab */}
              <TabsContent value="profile" className="mt-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Profile</h2>
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="avatar" className="text-sm font-medium">Avatar</Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="size-20">
                          <AvatarImage src={userAvatar} alt={userName} />
                          <AvatarFallback className="text-2xl">
                            {getInitials(userName, userEmail)}
                          </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                          <Input
                            id="avatarUrl"
                            type="url"
                            placeholder="https://example.com/avatar.jpg"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            className="w-64"
                          />
                          <p className="text-xs text-muted-foreground">Enter avatar URL</p>
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
                        {isGoogleSignIn ? (
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
