import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import OfflineBanner from '@/components/OfflineBanner'

export const metadata: Metadata = {
  title: 'ColdIQ — Refrigeration Expert',
  description: 'AI-powered supermarket refrigeration expert system',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ColdIQ',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom intentionally enabled — accessibility + zooming schematics on phones
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)',  color: '#1e293b' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-white dark:bg-slate-950 antialiased">
        <ServiceWorkerRegister />
        <ThemeProvider>
          <OfflineBanner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
