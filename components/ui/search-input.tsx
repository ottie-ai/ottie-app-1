'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LottieSearchIcon } from '@/components/ui/lottie-search-icon'
import { X } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  desktopWidth?: string
  mobileWidth?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  desktopWidth = 'md:w-80',
  mobileWidth = 'w-[200px]',
}: SearchInputProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Handle click outside search to collapse it
  useEffect(() => {
    if (!isSearchExpanded) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node) &&
        !value.trim()
      ) {
        setIsSearchExpanded(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSearchExpanded, value])

  return (
    <>
      {/* Desktop Search - Full width input */}
      <div className={`relative w-full ${desktopWidth} hidden md:block ${className}`}>
        <LottieSearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          placeholder={placeholder} 
          className={`pl-9 ${value ? 'pr-9' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            onClick={() => {
              onChange('')
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted/50 transition-colors"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Mobile Search Button - Expandable */}
      <div ref={searchContainerRef} className={`relative inline-flex items-center md:hidden ${className}`}>
        {!isSearchExpanded ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSearchExpanded(true)}
            className="gap-1.5 shrink-0"
          >
            <LottieSearchIcon size={18} className="shrink-0" />
            {value && (
              <span className="ml-0.5 h-5 px-1 text-xs rounded-full border-transparent bg-[#7c3aed] inline-flex items-center justify-center font-medium" style={{ color: 'white' }}>
                Active
              </span>
            )}
          </Button>
        ) : (
          <div className={`relative ${mobileWidth}`}>
            <LottieSearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              ref={searchInputRef}
              placeholder={placeholder} 
              className="pl-9 pr-9 h-8 text-sm"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
            />
            {value && (
              <button
                onClick={() => {
                  onChange('')
                  searchInputRef.current?.focus()
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted/50 transition-colors"
              >
                <X className="size-4 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

