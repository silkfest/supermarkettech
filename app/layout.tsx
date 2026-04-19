import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ColdIQ — Refrigeration Expert',
  description: 'AI-powered supermarket refrigeration expert system',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ColdIQ',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,          // Prevents iOS auto-zoom on input focus
  userScalable: false,
  viewportFit: 'cover',     // Handles iPhone notch / home bar
  themeColor: '#2563eb',    // Blue — matches the ColdIQ brand
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-white antialiased overflow-hidden">{children}</body>
    </html>
  )
}
