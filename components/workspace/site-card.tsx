'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Copy,
  Info,
  FileText,
  ImageOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  status: 'published' | 'draft'
  views?: number
  lastEdited?: string
  thumbnail: string | null
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
                <ImageOff className="size-6 text-muted-foreground" />
              </div>
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
                  <Info className="size-4 mr-2" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Pencil className="size-4 mr-2" />
                  Edit template
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="size-4 mr-2" />
                  Rename template
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="size-4 mr-2" />
                  Duplicate template
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <Trash2 className="size-4 mr-2" />
                  Remove template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Link>

      {/* Info below card */}
      <div className="pt-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground truncate">{site.title}</h3>
          <p className="text-sm text-muted-foreground font-mono truncate">{site.slug}</p>
        </div>
        <Badge 
          variant="secondary" 
          className="shrink-0 capitalize"
        >
          {site.status === 'published' ? 'Published' : 'Draft'}
        </Badge>
      </div>
    </div>
  )
}

