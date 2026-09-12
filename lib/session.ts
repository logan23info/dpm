// lib/session.ts
// Named session — lightweight identity without full auth.
// Every mutating request carries an actor name written to audit_log.
// Not secure — the point is to make the data model correct so real auth
// (Clerk, NextAuth) drops in later by replacing getActor() only.

import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export interface Actor {
  name: string
  role: 'preparer' | 'reviewer' | 'admin' | 'viewer'
}

// Server-side: extract actor from request header or cookie
export function getActor(req?: NextRequest): Actor {
  // From request header (API routes)
  if (req) {
    const name = req.headers.get('x-actor-name')
    const role = req.headers.get('x-actor-role') as Actor['role'] | null
    if (name) {
      return {
        name,
        role: role || 'preparer',
      }
    }
  }

  // Fallback — anonymous (should not reach production)
  return { name: 'Unknown', role: 'preparer' }
}

// Audit log helper — called from every mutating API route
export function auditEntry(params: {
  engagementId: string
  entityType: string
  entityId: string
  action: string
  actor: Actor
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
}) {
  return {
    engagement_id: params.engagementId,
    entity_type:   params.entityType,
    entity_id:     params.entityId,
    action:        params.action,
    actor_name:    params.actor.name,
    old_value:     params.oldValue ? JSON.stringify(params.oldValue) : null,
    new_value:     params.newValue ? JSON.stringify(params.newValue) : null,
  }
}
