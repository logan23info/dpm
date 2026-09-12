// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import SessionBanner from '@/app/components/SessionBanner'

export const metadata: Metadata = {
  title: 'DPM — Data Protection Management',
  description: 'IT Audit RCM & Privacy Controls Platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Session header — shows who-are-you on first load */}
        <div className="bg-slate-900 px-4 py-2 flex items-center justify-between">
          <span className="text-white text-sm font-semibold tracking-wide">DPM</span>
          <SessionBanner />
        </div>
        {children}
      </body>
    </html>
  )
}
