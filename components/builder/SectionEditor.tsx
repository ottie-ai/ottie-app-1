'use client'

import { useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkle, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface SectionEditorProps {
  children: ReactNode
  settingsPanel: ReactNode
  onSave?: () => void
  className?: string
}

/**
 * SectionEditor - Wraps a section with an expandable "Remix" button
 * that reveals settings when clicked
 */
export function SectionEditor({ 
  children, 
  settingsPanel, 
  onSave,
  className = '' 
}: SectionEditorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSave = () => {
    onSave?.()
    setIsOpen(false)
  }

  return (
    <div className={`relative group ${className}`}>
      {/* Section Content */}
      {children}

      {/* Remix Button / Settings Panel */}
      <div className="absolute top-4 right-4 z-40">
        <AnimatePresence mode="wait">
          {!isOpen ? (
            <motion.div
              key="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <Button
                onClick={() => setIsOpen(true)}
                size="sm"
                className="gap-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <Sparkle weight="fill" className="w-4 h-4" />
                Remix
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="w-80 shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <Sparkle weight="fill" className="w-4 h-4 text-foreground" />
                    <span className="font-medium text-sm">Edit Section</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Settings Content */}
                <CardContent className="p-4 max-h-[60vh] overflow-y-auto">
                  {settingsPanel}
                </CardContent>

                {/* Footer */}
                <div className="px-4 py-3 border-t bg-muted/30">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setIsOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleSave}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

