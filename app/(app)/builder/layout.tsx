/**
 * Editor Layout
 * 
 * This layout isolates the template/editor content from admin UI theming.
 * Only admin UI components (workspace navbar, edit buttons) should respect
 * the global theme. The template content itself should NOT be affected by
 * dark mode or any admin UI styling changes.
 * 
 * Note: ThemeProvider and AuthGuard are handled by the parent (app)/layout.tsx
 */
export default function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Admin UI wrapper - only admin components inside get theme
      <div className="admin-ui-theme">
        {children}
      </div>
  )
}

