import { ThemeProvider } from '@/components/theme-provider'
import Script from 'next/script'
import { AuthGuard } from '@/app/(app)/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { PageConfig, LoaderConfig } from '@/types/builder'
import '@/app/(builder)/builder.css'

/**
 * Builder Layout - Full-screen layout pre layout editor
 * 
 * Tento layout je v samostatnej route group (builder), ktorá NEDEDÍ workspace layout.
 * Nemá sidebar/nav, workspace background ani žiadne workspace UI.
 * 
 * URL: /builder/[id]
 * 
 * Načítava loader config na serveri, aby sa správny background nastavil hneď v HTML.
 */
export default async function BuilderLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    notFound()
  }

  // Fetch site config to get loader config (for background color)
  const { data: site } = await supabase
    .from('sites')
    .select('config, workspace_id, creator_id, assigned_agent_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!site) {
    notFound()
  }

  // Check permissions (quick check - full check in page.tsx)
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', site.workspace_id)
    .eq('user_id', user.id)
    .single()

  const isOwnerOrAdmin = membership?.role === 'owner' || membership?.role === 'admin'
  const isCreator = site.creator_id === user.id
  const isAssignedAgent = site.assigned_agent_id === user.id

  if (!isOwnerOrAdmin && !isCreator && !isAssignedAgent) {
    notFound()
  }

  // Get loader config from site config to set background immediately (prevents white flash)
  const config = site.config as PageConfig | null
  const loaderConfig: LoaderConfig = config?.loader || { type: 'none', colorScheme: 'light' }
  const loaderBackground = loaderConfig.type !== 'none' && loaderConfig.colorScheme === 'dark' 
    ? '#000000' 
    : '#ffffff'

  return (
    <AuthGuard>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        {/* Set loader background immediately in HTML to prevent white flash */}
        <style dangerouslySetInnerHTML={{
          __html: `
            body {
              background-color: ${loaderBackground} !important;
              background-image: none !important;
            }
            html {
              background-color: ${loaderBackground} !important;
            }
          `
        }} />
        {/* Ensure body has site-route class and correct background before hydration */}
        <Script
          id="builder-site-route-class"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof document !== 'undefined') {
                document.body.classList.add('site-route');
                document.documentElement.classList.add('site-route');
                document.body.style.backgroundColor = '${loaderBackground}';
                document.documentElement.style.backgroundColor = '${loaderBackground}';
              }
            `,
          }}
        />
        {/* No wrapper div - site content provides its own background */}
        {children}
      </ThemeProvider>
    </AuthGuard>
  )
}

