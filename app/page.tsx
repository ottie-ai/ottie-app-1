'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Typography } from '@/components/ui/typography'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const BackgroundEffect = dynamic(() => import('@/components/background-effect'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

export default function Home() {
  const [link, setLink] = useState('')

  return (
    <>
      <BackgroundEffect />
      <div className="content">
        <div className="quote-container">
          {/* Eyebrow */}
          <Typography variant="small" className="mb-4 text-muted-foreground uppercase tracking-wider">
            Ottie App
          </Typography>

          {/* Heading */}
          <Typography variant="h1" className="mb-6">
            Luminous absence
          </Typography>

          {/* Subheading */}
          <Typography variant="lead" className="mb-8 max-w-2xl">
            The light reveals what darkness conceals, but never explains
          </Typography>

          {/* Input Section */}
          <div className="w-full max-w-md space-y-2">
            <Label htmlFor="link-input">Enter your link</Label>
            <Input
              id="link-input"
              type="url"
              placeholder="https://example.com"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Manual Start Link */}
          <div className="mt-6">
            <Link 
              href="#" 
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            >
              alebo začni manuálne
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

