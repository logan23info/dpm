import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export interface Actor {
  id?: string
  name: string
  email?: string
  role: 'preparer' | 'reviewer' | 'admin' | 'viewer'
}

export async function getActorFromSession(): Promise<Actor | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return null
    return {
      id: session.user.id,
      name: session.user.name || session.user.email || 'Unknown',
      email: session.user.email,
      role: ((session.user as any).role as Actor['role']) || 'preparer',
    }
  } catch (e) { return null }
}

// Backward-compat for API routes (actor sent in x-actor-* headers)
export function getActor(req?: NextRequest): Actor {
  if (req) {
    const name = req.headers.get('x-actor-name')
    const role = req.headers.get('x-actor-role') as Actor['role'] | null
    const id   = req.headers.get('x-actor-id')
    if (name) return { id: id || undefined, name, role: role || 'preparer' }
  }
  return { name: 'Unknown', role: 'preparer' }
}
