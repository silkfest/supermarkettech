import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ColdIQ — Refrigeration Expert',
  description: 'AI-powered supermarket refrigeration expert system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-full bg-white antialiased">{children}</body>
    </html>
  )
}
