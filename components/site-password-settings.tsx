'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Field, 
  FieldGroup, 
  FieldLabel,
  FieldSeparator
} from '@/components/ui/field'
import { handleSetSitePassword, handleRemoveSitePassword } from '@/app/actions/site-actions'
import { toast } from 'sonner'
import { toastSuccess } from '@/lib/toast-helpers'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { useAppData } from '@/contexts/app-context'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SitePasswordSettingsProps {
  siteId: string
  passwordProtected: boolean
  onUpdate?: () => void // Callback when password is updated
}

export function SitePasswordSettings({ 
  siteId, 
  passwordProtected: initialPasswordProtected,
  onUpdate 
}: SitePasswordSettingsProps) {
  const { currentWorkspace, hasPlanFeature } = useAppData()
  const hasPasswordFeature = currentWorkspace 
    ? hasPlanFeature(currentWorkspace.plan, 'feature_password_protection')
    : false
  
  const [passwordProtected, setPasswordProtected] = useState(initialPasswordProtected)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      // Enable password protection - need password
      if (!password.trim()) {
        toast.error('Please enter a password to enable protection')
        setPasswordProtected(false)
        return
      }

      setIsSaving(true)
      const result = await handleSetSitePassword(siteId, password)
      setIsSaving(false)

      if ('error' in result) {
        toast.error(result.error)
        setPasswordProtected(false)
      } else {
        toastSuccess('Password protection enabled')
        setPasswordProtected(true)
        setPassword('') // Clear password after saving
        onUpdate?.()
      }
    } else {
      // Disable password protection
      setIsSaving(true)
      const result = await handleRemoveSitePassword(siteId)
      setIsSaving(false)

      if ('error' in result) {
        toast.error(result.error)
        setPasswordProtected(true)
      } else {
        toastSuccess('Password protection disabled')
        setPasswordProtected(false)
        setPassword('') // Clear password
        onUpdate?.()
      }
    }
  }

  const handleChangePassword = async () => {
    if (!password.trim()) {
      toast.error('Please enter a new password')
      return
    }

    setIsSaving(true)
    const result = await handleSetSitePassword(siteId, password)
    setIsSaving(false)

    if ('error' in result) {
      toast.error(result.error)
    } else {
      toastSuccess('Password updated successfully')
      setPassword('')
      onUpdate?.()
    }
  }

  // If feature is not available, show upgrade message
  if (!hasPasswordFeature) {
    return (
      <FieldGroup className="gap-5">
        <FieldSeparator />
        <Alert>
          <Lock className="size-4" />
          <AlertDescription>
            Password protection is not available on your current plan. Please upgrade to access this feature.
          </AlertDescription>
        </Alert>
      </FieldGroup>
    )
  }

  return (
    <FieldGroup className="gap-5">
      <FieldSeparator />
      
      <Field orientation="horizontal">
        <div className="flex-1">
          <FieldLabel htmlFor="password-protection" className="flex items-center gap-2">
            <Lock className="size-4" />
            Password Protection
          </FieldLabel>
          <p className="text-sm text-muted-foreground mt-1">
            Require a password to access this site
          </p>
        </div>
        <Switch
          id="password-protection"
          checked={passwordProtected}
          onCheckedChange={handleToggle}
          disabled={isSaving}
        />
      </Field>

      {passwordProtected && (
        <>
          <Field>
            <FieldLabel htmlFor="site-password">
              {initialPasswordProtected ? 'Change Password' : 'Set Password'}
            </FieldLabel>
            <div className="relative">
              <Input
                id="site-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter site password"
                className="pr-10"
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isSaving}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {password.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleChangePassword}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : initialPasswordProtected ? 'Update Password' : 'Set Password'}
              </Button>
            )}
          </Field>
        </>
      )}
    </FieldGroup>
  )
}

