'use client'

import { useState } from 'react'
import { Users, Sparkles, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

const features = [
  'Branded client portal for each property',
  'Share documents, photos, and updates',
  'Real-time messaging with clients',
  'Track client engagement and activity',
  'Secure document signing integration',
  'Custom domain support',
]

export default function ClientPortalsPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSubmitted(true)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Client Portals</h1>
          <Badge className="gradient-ottie hover:opacity-90 text-white border-0">Coming Soon</Badge>
        </div>
      </header>

      {/* Main Content - scrollable */}
      <main className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="size-24 rounded-full gradient-ottie-subtle flex items-center justify-center">
                <Users className="size-12 gradient-ottie-text" />
              </div>
              <div className="absolute -top-1 -right-1 size-8 rounded-full gradient-ottie flex items-center justify-center">
                <Sparkles className="size-4 text-white" />
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">
              Client Portals
            </h2>
            <p className="text-xl text-muted-foreground">
              Planned for <span className="font-semibold text-foreground">Q2 2026</span>
            </p>
            <p className="text-muted-foreground max-w-md mx-auto">
              Create branded client portals for your properties. Share documents, 
              communicate with clients, and track engagement — all in one place.
            </p>
          </div>

          {/* Features */}
          <Card className="text-left">
            <CardHeader>
              <CardTitle className="text-base">What&apos;s coming</CardTitle>
              <CardDescription>Features planned for Client Portals</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 sm:grid-cols-2">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 flex-shrink-0 gradient-ottie-text" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Early Access Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Get Early Access</CardTitle>
              <CardDescription>
                Be the first to know when Client Portals launches
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Check className="size-5 gradient-ottie-text" />
                  <span className="font-medium gradient-ottie-text">You&apos;re on the list! We&apos;ll notify you when it&apos;s ready.</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit">
                    Notify Me
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

