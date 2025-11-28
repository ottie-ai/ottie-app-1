'use client'

import { ThemeProvider } from '@/components/theme-provider'

/**
 * Preview Layout
 * 
 * This layout isolates the template/preview content from admin UI theming.
 * Only admin UI components (workspace navbar, edit buttons) should respect
 * the global theme. The template content itself should NOT be affected by
 * dark mode or any admin UI styling changes.
 */
export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {/* Admin UI wrapper - only admin components inside get theme */}
      <div className="admin-ui-theme">
        {children}
      </div>
    </ThemeProvider>
  )
}

