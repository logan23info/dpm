// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'
import SessionBanner from '@/app/components/SessionBanner'
import ErrorBoundary from '@/app/components/ErrorBoundary'

export const metadata: Metadata = {
  title: { default: 'DPM — Data Protection Management', template: '%s | DPM' },
  description: 'Privacy & Data Protection Audit Platform — GDPR, DPDP Act, ISO 27701, NIST',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="bg-slate-900 px-4 py-2 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-white font-bold text-sm tracking-wide hover:text-amber-400 transition">DPM</a>
            <span className="text-slate-600 text-xs">|</span>
            <a href="/privacy" className="text-slate-400 text-xs hover:text-white transition">Privacy Hub</a>
            <a href="/cross-framework" className="text-slate-400 text-xs hover:text-white transition">Framework Map</a>
            <a href="/controls" className="text-slate-400 text-xs hover:text-white transition">Control Library</a>
          </div>
          <SessionBanner />
        </div>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
