'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor, Info, Check, Star } from 'lucide-react'
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
import { PricingDialog } from '@/components/dashboard/pricing-dialog'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('profile')

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
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

                {/* Settings Fields */}
                <div className="space-y-4">
                  {/* Avatar */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="avatar" className="text-sm font-medium">Avatar</Label>
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
                  </div>

                  <Separator />

                  {/* First Name */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="firstName" className="text-sm font-medium">First name</Label>
                    <div className="flex items-center gap-3">
                      <Input id="firstName" defaultValue="John" className="w-64" />
                    </div>
                  </div>

                  <Separator />

                  {/* Last Name */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lastName" className="text-sm font-medium">Last name</Label>
                    <div className="flex items-center gap-3">
                      <Input id="lastName" defaultValue="Doe" className="w-64" />
                    </div>
                  </div>

                  <Separator />

                  {/* Email */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <div className="flex items-center gap-3">
                      <Input id="email" type="email" defaultValue="john@example.com" className="w-64" />
                    </div>
                  </div>

                  <Separator />

                  {/* Phone */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="phone" className="text-sm font-medium">Phone number</Label>
                    <div className="flex items-center gap-3">
                      <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" className="w-64" />
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
                        Receive emails about page views and leads
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
                        Get a weekly summary of your page performance
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
                    <li>• Up to 3 pages</li>
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
    </div>
  )
}
