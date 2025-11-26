'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const navItems = [
  { id: 'profile', label: 'Profile' },
  { id: 'company', label: 'Company' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'plan', label: 'Plan & Billing' },
  { id: 'danger', label: 'Danger Zone' },
]

export default function SettingsPage() {
  const sectionRefs = {
    profile: useRef<HTMLDivElement>(null),
    company: useRef<HTMLDivElement>(null),
    notifications: useRef<HTMLDivElement>(null),
    plan: useRef<HTMLDivElement>(null),
    danger: useRef<HTMLDivElement>(null),
  }

  const scrollToSection = (id: string) => {
    const ref = sectionRefs[id as keyof typeof sectionRefs]
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
        </div>
      </header>

      {/* Main Content with Side Navigation */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Side Navigation - fixed sidebar */}
        <nav className="hidden md:flex w-64 shrink-0 flex-col gap-1 border-r p-4 overflow-y-auto">
          <p className="text-sm font-medium text-muted-foreground mb-2">Settings</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={cn(
                'text-left px-3 py-2 text-sm rounded-md transition-colors',
                'hover:bg-muted',
                item.id === 'danger' && 'text-destructive hover:bg-destructive/10'
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Content - scrollable */}
        <main className="flex-1 p-6 space-y-6 max-w-3xl overflow-y-auto">
          {/* Profile Section */}
          <div ref={sectionRefs.profile} id="profile" className="scroll-mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Manage your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="size-20">
                    <AvatarImage src="" alt="John Doe" />
                    <AvatarFallback className="text-2xl">JD</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <Button variant="outline" size="sm">Change photo</Button>
                    <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>

                <Separator />

                {/* Name */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" defaultValue="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" defaultValue="Doe" />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john@example.com" />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" />
                </div>

                <Button>Save changes</Button>
              </CardContent>
            </Card>
          </div>

          {/* Company Section */}
          <div ref={sectionRefs.company} id="company" className="scroll-mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Company</CardTitle>
                <CardDescription>
                  Your company information for branding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company name</Label>
                  <Input id="companyName" placeholder="Acme Real Estate" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" type="url" placeholder="https://example.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license">License number</Label>
                  <Input id="license" placeholder="DRE #01234567" />
                </div>

                <Button>Save changes</Button>
              </CardContent>
            </Card>
          </div>

          {/* Notifications Section */}
          <div ref={sectionRefs.notifications} id="notifications" className="scroll-mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Configure how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails about page views and leads
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Get a weekly summary of your page performance
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
              </CardContent>
            </Card>
          </div>

          {/* Plan Section */}
          <div ref={sectionRefs.plan} id="plan" className="scroll-mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Current Plan
                  <Badge variant="secondary">Free</Badge>
                </CardTitle>
                <CardDescription>
                  Manage your subscription and billing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Free Plan</span>
                    <span className="text-muted-foreground">$0/month</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Up to 3 pages</li>
                    <li>• Basic analytics</li>
                    <li>• Ottie branding</li>
                  </ul>
                </div>

                <Button className="w-full">Upgrade to Pro</Button>
              </CardContent>
            </Card>
          </div>

          {/* Danger Zone */}
          <div ref={sectionRefs.danger} id="danger" className="scroll-mt-6">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions for your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
