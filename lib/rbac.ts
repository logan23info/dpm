// lib/rbac.ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export type Role = 'admin' | 'reviewer' | 'preparer' | 'viewer'
const RANK: Record<Role, number> = { admin: 4, reviewer: 3, preparer: 2, viewer: 1 }

export async function getSessionUser() {
  try {
    const s = await auth.api.getSession({ headers: await headers() })
    return s?.user ? (s.user as any) : null
  } catch { return null }
}

export async function requireRole(minRole: Role): Promise<{ user: any } | NextResponse> {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((RANK[user.role as Role] || 0) < RANK[minRole])
    return NextResponse.json({ error: `Requires ${minRole} role` }, { status: 403 })
  return { user }
}

export const canSignOff = (role: string) => ['reviewer', 'admin'].includes(role)
export const canEdit    = (role: string) => ['preparer', 'reviewer', 'admin'].includes(role)
export const canAdmin   = (role: string) => role === 'admin'
export const canView    = (role: string) => !!role
