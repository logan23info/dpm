import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import "./globals.css"

export const metadata: Metadata = {
  title: "RCM Studio",
  description: "Privacy & Data Protection Risk Control Matrix Platform",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Public pages that don't require auth
  const publicPaths = ["/auth/signin", "/auth/signup"]
  
  // This is a server component, so we can't check the pathname directly
  // Instead, we rely on middleware for auth routing

  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  )
}
