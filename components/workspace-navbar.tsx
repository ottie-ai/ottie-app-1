'use client'

import { ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CaretUpDown, GearSix, ArrowLeft } from '@phosphor-icons/react'

interface WorkspaceNavbarProps {
  userName?: string
  userEmail?: string
  userAvatar?: string
  companyName?: string
  settingsPanel?: ReactNode
  onSaveSettings?: () => void
}

export function WorkspaceNavbar({
  userName = 'John Doe',
  userEmail = 'john@example.com',
  userAvatar,
  companyName = 'Real Estate Co.',
  settingsPanel,
  onSaveSettings,
}: WorkspaceNavbarProps) {
  // Get initials for avatar fallback
  return (
    <nav className="fixed top-2 left-2 right-2 z-50">
      <div className="flex h-12 items-center px-2 rounded-lg border border-border/20 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30 shadow-lg">
        {/* Left side - Back button */}
        <div className="flex items-center">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" weight="bold" />
            Back to Dashboard
          </Button>
        </div>

        {/* Center - Logo & Company */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <span className="text-sm font-bold">Ottie</span>
              <span className="text-muted-foreground text-sm">×</span>
              <div className="flex items-center gap-2">
                <div className="size-4 rounded-full bg-gradient-to-br from-lime-400 via-amber-300 to-orange-500" />
                <span className="text-sm font-medium">{companyName}</span>
              </div>
              <Badge variant="secondary">Free</Badge>
              <CaretUpDown className="size-4 text-muted-foreground" weight="bold" />
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarImage src={userAvatar} alt={userName} />
                    <AvatarFallback>
                      {userName
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userEmail}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right side - Actions */}
        <div className="ml-auto flex items-center gap-2">
          {settingsPanel && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <GearSix className="size-4" weight="fill" />
                  Settings
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Typography and style options.
                    </p>
                  </div>
                  <div className="max-h-[50vh] overflow-y-auto">
                    {settingsPanel}
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => onSaveSettings?.()}
                  >
                    Save
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">Publish</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Publish Your Website</DialogTitle>
                <DialogDescription>
                  Create an account to publish your website and make it live.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Button variant="outline" className="w-full">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
                  Sign up with Google
                </Button>
                <Button variant="outline" className="w-full">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 814 1000" fill="currentColor">
                    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
                  </svg>
                  Sign up with Apple
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-2 text-muted-foreground">
                      or continue with email
                    </span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button className="w-full">Create Account & Publish</Button>
                <p className="text-xs text-center text-muted-foreground">
                  By signing up, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </nav>
  )
}

