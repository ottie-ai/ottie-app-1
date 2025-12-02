'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  MoreHorizontal, 
  Eye,
} from 'lucide-react'
import { LottiePhotoIcon } from '@/components/ui/lottie-photo-icon'
import { LottieAnalyticsIcon } from '@/components/ui/lottie-analytics-icon'
import { LottieEditIcon } from '@/components/ui/lottie-edit-icon'
import { LottieBookIcon } from '@/components/ui/lottie-book-icon'
import { LottieAccountIcon } from '@/components/ui/lottie-account-icon'
import { LottieCopyIcon } from '@/components/ui/lottie-copy-icon'
import { LottieTrashIcon } from '@/components/ui/lottie-trash-icon'
import { LottieInboxIcon } from '@/components/ui/lottie-inbox-icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface SiteCardData {
  id: string
  title: string
  slug: string
  status: 'published' | 'draft' | 'archived'
  views?: number
  lastEdited?: string
  thumbnail: string | null
  avatar?: string | null
  avatarFallback?: string
}

interface SiteCardProps {
  site: SiteCardData
  href?: string
}

export function SiteCard({ site, href = `/builder/${site.id}` }: SiteCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="group">
      {/* Card with Thumbnail */}
      <Link href={href}>
        <div className="relative aspect-[4/3] bg-muted rounded-2xl overflow-hidden">
          {site.thumbnail ? (
            <img 
              src={site.thumbnail} 
              alt={site.title}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/30">
              <div className="flex items-center justify-center size-16 rounded-2xl bg-muted/80">
                <LottiePhotoIcon className="text-muted-foreground" size={24} />
              </div>
            </div>
          )}
          {/* Avatar in top left corner */}
          <div className="absolute top-3 left-3 z-10">
            <div className="size-12 rounded-full p-[2px] bg-background">
              <Avatar className="size-full">
                <AvatarImage src={site.avatar || undefined} alt={site.title} />
                <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                  {site.avatarFallback || site.title.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          {/* Views in bottom right corner */}
          {site.views !== undefined && (
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border/50">
              <Eye className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{site.views.toLocaleString()}</span>
            </div>
          )}
          
          {/* Menu Button - appears on hover */}
          <div 
            className={`absolute top-3 right-3 transition-opacity ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onClick={(e) => e.preventDefault()}
          >
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="size-9 rounded-xl bg-muted/90 backdrop-blur-sm hover:bg-muted"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <LottieAnalyticsIcon className="size-4 mr-2" />
                  Analytics
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LottieEditIcon className="size-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <LottieBookIcon className="size-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <LottieAccountIcon className="size-4 mr-2" />
                  Reassign
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <LottieCopyIcon className="size-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LottieInboxIcon className="size-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  <LottieTrashIcon className="size-4 mr-2" destructive={true} />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Link>

      {/* Info below card */}
      <div className="pt-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">{site.title}</h3>
          <p className="text-xs text-muted-foreground font-mono truncate">{site.slug}</p>
        </div>
        <Badge 
          variant="secondary" 
          className={`shrink-0 capitalize ${
            site.status === 'published' 
              ? 'gradient-ottie hover:opacity-90 text-white border-0' 
              : site.status === 'archived'
              ? 'bg-muted/50 text-muted-foreground/60 border-muted-foreground/20'
              : ''
          }`}
        >
          {site.status === 'published' ? 'Published' : site.status === 'archived' ? 'Archived' : 'Draft'}
        </Badge>
      </div>
    </div>
  )
}

