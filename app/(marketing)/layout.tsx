/**
 * Homepage Layout
 * 
 * This layout isolates the homepage from global theme provider.
 * Homepage has its own hardcoded dark styling and should NOT be
 * affected by admin UI theme changes.
 */
export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

