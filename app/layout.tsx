import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Ottie App",
  description: "A Next.js 14 fullstack application",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

