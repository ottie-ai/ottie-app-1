'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { verifySitePassword } from '@/app/actions/site-actions'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'

interface SitePasswordFormProps {
  siteId: string
  siteTitle: string
  onSuccess: () => void
}

export function SitePasswordForm({ siteId, siteTitle, onSuccess }: SitePasswordFormProps) {
  const [password, setPassword] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password.trim()) {
      setError('Please enter a password')
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      const result = await verifySitePassword(siteId, password)
      
      if ('error' in result) {
        const errorMessage = result.error || 'An error occurred'
        setError(errorMessage)
        toast.error(errorMessage)
      } else {
        // Store access token in cookie (24 hours)
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24)
        
        document.cookie = `site_access_${siteId}=${Date.now()}; expires=${expiresAt.toUTCString()}; path=/; SameSite=Lax`
        
        toast.success('Access granted')
        onSuccess()
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        <div className="bg-card border border-border rounded-lg shadow-lg p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-muted">
              <Lock className="size-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Password Protected</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                This site is password protected
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Enter password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(null)
                }}
                placeholder="Enter site password"
                autoFocus
                disabled={isVerifying}
                className={error ? 'border-destructive' : ''}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit(e)
                  }
                }}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isVerifying || !password.trim()}
            >
              {isVerifying ? 'Verifying...' : 'Access Site'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

