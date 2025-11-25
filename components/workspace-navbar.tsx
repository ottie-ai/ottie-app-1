'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CaretUpDown, GearSix } from '@phosphor-icons/react'

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
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 w-full items-center justify-between px-6">
        {/* Left side - Logo & Company */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <span className="text-sm font-bold">Ottie</span>
              <span className="text-muted-foreground text-sm">/</span>
              <div className="flex items-center gap-2">
                <div className="size-4 rounded-full bg-gradient-to-br from-lime-400 via-amber-300 to-orange-500" />
                <span className="text-sm font-medium">{companyName}</span>
              </div>
              <Badge variant="secondary">Free</Badge>
              <CaretUpDown className="size-4 text-muted-foreground" weight="bold" />
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
        <div className="flex items-center gap-2">
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
          <Button size="sm">Publish</Button>
        </div>
      </div>
    </nav>
  )
}

