'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GearSix, SignOut, User } from '@phosphor-icons/react'

interface WorkspaceNavbarProps {
  userName?: string
  userEmail?: string
  userAvatar?: string
  companyName?: string
}

export function WorkspaceNavbar({
  userName = 'John Doe',
  userEmail = 'john@example.com',
  userAvatar,
  companyName = 'Real Estate Co.',
}: WorkspaceNavbarProps) {
  // Get initials for avatar fallback
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left side - Logo & Company */}
        <div className="flex items-center gap-3">
          {/* Ottie Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">Ottie</span>
            <span className="text-muted-foreground">×</span>
          </div>

          {/* User Avatar & Company */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
                <Avatar className="size-8">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{companyName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userEmail}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 size-4" weight="duotone" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <GearSix className="mr-2 size-4" weight="duotone" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <SignOut className="mr-2 size-4" weight="duotone" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <GearSix className="size-4" weight="fill" />
            Settings
          </Button>
          <Button size="sm" className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
            Publish
          </Button>
        </div>
      </div>
    </nav>
  )
}

