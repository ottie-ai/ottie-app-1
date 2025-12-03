'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
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
import { ChevronsUpDown, Settings, ArrowLeft } from 'lucide-react'
import { normalizePlan } from '@/lib/utils'
import { useAppData } from '@/contexts/app-context'
import type { Workspace } from '@/types/database'

interface WorkspaceNavbarProps {
  userName?: string
  userEmail?: string
  userAvatar?: string
  companyName?: string
  workspace?: Workspace | null
  settingsPanel?: ReactNode
  onSaveSettings?: () => void
}

export function WorkspaceNavbar({
  userName = 'John Doe',
  userEmail = 'john@example.com',
  userAvatar,
  companyName,
  workspace,
  settingsPanel,
  onSaveSettings,
}: WorkspaceNavbarProps) {
  // Get isMultiUserPlan from context (single source of truth from DB)
  const { isMultiUserPlan } = useAppData()
  
  // For single-user plans (max_users = 1), show user name instead of workspace name
  // For multi-user plans (max_users > 1), show workspace name
  // If plan is null/undefined, treat as 'free' (single-user)
  const displayName = workspace && isMultiUserPlan(workspace.plan)
    ? workspace.name
    : (companyName || userName || 'Real Estate Co.')
  
  // Normalize plan for display (null/undefined becomes 'free')
  const displayPlan = workspace ? normalizePlan(workspace.plan) : 'free'
  
  // Get initials for avatar fallback
  return (
    <motion.nav
      className="fixed top-2 left-2 right-2 z-50"
      initial={{ y: -100, opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ 
        duration: 1.2, 
        ease: [0.16, 1, 0.3, 1],
        opacity: { duration: 0.8 },
        scale: { duration: 1, ease: [0.16, 1, 0.3, 1] },
        filter: { duration: 0.6 }
      }}
    >
      <div className="flex h-12 items-center px-2 rounded-lg border border-border/20 bg-background shadow-lg">
        {/* Left side - Back button */}
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="gap-1" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
              <span className="hidden md:inline">Back to Dashboard</span>
            </Link>
          </Button>
        </div>

        {/* Center - Logo & Company */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5">
          <svg className="h-4 w-auto" viewBox="0 0 389 145" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M283.836 90.992C283.836 84.224 285.027 77.7067 287.408 71.44C289.789 65.048 293.236 59.408 297.748 54.52C302.26 49.632 307.712 45.7467 314.104 42.864C320.496 39.9814 327.703 38.54 335.724 38.54C343.62 38.54 350.827 39.9187 357.344 42.676C363.861 45.308 369.439 49.0054 374.076 53.768C378.713 58.5307 382.285 64.2334 384.792 70.876C387.424 77.5187 388.74 84.788 388.74 92.684C388.74 93.812 388.74 94.752 388.74 95.504C388.74 96.256 388.677 97.196 388.552 98.324H308.088C309.341 105.844 312.537 111.609 317.676 115.62C322.815 119.505 328.956 121.448 336.1 121.448C342.116 121.448 347.192 120.508 351.328 118.628C355.464 116.748 359.663 113.991 363.924 110.356L381.784 125.208C379.528 127.715 376.896 130.096 373.888 132.352C370.88 134.483 367.496 136.425 363.736 138.18C359.976 139.809 355.777 141.125 351.14 142.128C346.628 143.131 341.615 143.632 336.1 143.632C328.204 143.632 320.997 142.253 314.48 139.496C308.088 136.739 302.573 133.041 297.936 128.404C293.424 123.641 289.915 118.064 287.408 111.672C285.027 105.155 283.836 98.2614 283.836 90.992ZM309.216 78.584H363.548C361.793 72.6934 358.472 68.1187 353.584 64.86C348.696 61.476 342.868 59.784 336.1 59.784C329.833 59.784 324.381 61.3507 319.744 64.484C315.232 67.492 311.723 72.192 309.216 78.584Z" fill="currentColor"/>
            <path d="M238.797 141V41.172H263.801V141H238.797ZM235.225 15.228C235.225 10.8413 236.791 7.20667 239.925 4.324C243.058 1.44133 246.818 0 251.205 0C255.717 0 259.477 1.62933 262.485 4.888C265.618 8.14667 267.185 12.032 267.185 16.544C267.185 20.9307 265.618 24.6907 262.485 27.824C259.351 30.9573 255.591 32.524 251.205 32.524C246.567 32.524 242.745 30.832 239.737 27.448C236.729 23.9387 235.225 19.8653 235.225 15.228Z" fill="currentColor"/>
            <path d="M172.469 41.172H185.253V4.32397H210.257V41.172H225.109V62.792H210.257V141H185.253V62.792H172.469V41.172Z" fill="currentColor"/>
            <path d="M113.352 41.172H126.136V4.32397H151.14V41.172H165.992V62.792H151.14V141H126.136V62.792H113.352V41.172Z" fill="currentColor"/>
            <path d="M0 91.452C0 84.0573 1.37867 77.164 4.136 70.772C6.89333 64.38 10.6533 58.8653 15.416 54.228C20.304 49.4653 25.8813 45.768 32.148 43.136C38.54 40.3787 45.308 39 52.452 39C59.596 39 66.3013 40.3787 72.568 43.136C78.96 45.768 84.5373 49.4653 89.3 54.228C94.188 58.8653 98.0107 64.38 100.768 70.772C103.525 77.164 104.904 84.0573 104.904 91.452C104.904 98.7213 103.588 105.552 100.956 111.944C98.324 118.336 94.6267 123.913 89.864 128.676C85.2267 133.439 79.712 137.199 73.32 139.956C66.928 142.713 59.972 144.092 52.452 144.092C44.932 144.092 37.976 142.713 31.584 139.956C25.192 137.199 19.6147 133.439 14.852 128.676C10.2147 123.913 6.58 118.336 3.948 111.944C1.316 105.552 0 98.7213 0 91.452ZM25.192 91.64C25.192 96.0267 25.8813 99.9747 27.26 103.484C28.764 106.993 30.7067 110.001 33.088 112.508C35.5947 115.015 38.4773 116.957 41.736 118.336C45.12 119.715 48.692 120.404 52.452 120.404C56.212 120.404 59.7213 119.715 62.98 118.336C66.364 116.957 69.2467 115.015 71.628 112.508C74.1347 110.001 76.0773 106.993 77.456 103.484C78.96 99.9747 79.712 96.0267 79.712 91.64C79.712 87.3787 79.0227 83.4933 77.644 79.984C76.3907 76.4747 74.5733 73.4667 72.192 70.96C69.8107 68.328 66.928 66.3227 63.544 64.944C60.16 63.44 56.4627 62.688 52.452 62.688C48.4413 62.688 44.744 63.44 41.36 64.944C37.976 66.3227 35.0933 68.328 32.712 70.96C30.3307 73.4667 28.4507 76.4747 27.072 79.984C25.8187 83.4933 25.192 87.3787 25.192 91.64Z" fill="currentColor"/>
          </svg>
          <span className="text-muted-foreground text-sm mr-[-6px]">×</span>
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 md:gap-2">
              <div className="flex items-center gap-1 md:gap-2">
                <div className="size-4 rounded-full bg-gradient-to-br from-lime-400 via-amber-300 to-orange-500" />
                <span className="text-sm font-medium hidden sm:inline">{displayName}</span>
              </div>
              <Badge variant="secondary" className="hidden md:inline-flex capitalize">
                {displayPlan}
              </Badge>
              <ChevronsUpDown className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarImage src={userAvatar || undefined} alt={userName} />
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
                  <Settings className="size-4" />
                  <span className="hidden md:inline">Settings</span>
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
    </motion.nav>
  )
}

