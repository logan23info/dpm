// app/api/workpapers/[id]/signoff/route.ts
// RBAC enforced: only reviewer or admin can sign off
// Segregation of duties: cannot sign off your own workpaper

import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/rbac'
import { getActor } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Must be reviewer or admin
  const check = await requireRole('reviewer')
  if (check instanceof NextResponse) return check
  const { user } = check

  try {
    const { reason } = await req.json().catch(() => ({}))

    const wpResult = await sql`SELECT * FROM workpapers WHERE id = ${params.id}`
    if (wpResult.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const wp = wpResult.rows[0] as any

    // Segregation of duties: cannot sign off workpaper you prepared
    if (wp.prepared_by && wp.prepared_by === user.id) {
      return NextResponse.json({
        error: 'Segregation of duties: you cannot sign off a workpaper you prepared'
      }, { status: 403 })
    }

    // Check open review notes
    const openNotes = await sql`
      SELECT COUNT(*) as count FROM comments
      WHERE workpaper_id = ${params.id} AND status = 'open'
    `
    const openCount = parseInt((openNotes.rows[0] as any).count)
    if (openCount > 0) {
      return NextResponse.json({
        error: `Cannot sign off: ${openCount} open review note(s) must be resolved first`
      }, { status: 400 })
    }

    const result = await sql`
      UPDATE workpapers SET
        signed_off_at = NOW(),
        reviewed_by   = ${user.name || user.email},
        reviewer_id   = ${user.id},
        updated_at    = NOW()
      WHERE id = ${params.id}
      RETURNING *
    `

    // Audit log
    await sql`
      INSERT INTO audit_log (engagement_id, entity_type, entity_id, action, actor_name, new_value, created_at)
      VALUES (${wp.engagement_id}, 'workpaper', ${params.id}, 'signed_off', ${user.name || user.email},
        ${JSON.stringify({ reviewed_by: user.name, reason: reason || null })}, NOW())
    `.catch(() => {})

    return NextResponse.json(result.rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const check = await requireRole('reviewer')
  if (check instanceof NextResponse) return check
  const { user } = check

  try {
    const { reason } = await req.json().catch(() => ({}))
    if (!reason?.trim()) return NextResponse.json({ error: 'Reason required to revert sign-off' }, { status: 400 })

    const wpResult = await sql`SELECT engagement_id FROM workpapers WHERE id = ${params.id}`
    if (wpResult.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const result = await sql`
      UPDATE workpapers SET signed_off_at = NULL, reviewed_by = NULL, reviewer_id = NULL, updated_at = NOW()
      WHERE id = ${params.id} RETURNING *
    `

    await sql`
      INSERT INTO audit_log (engagement_id, entity_type, entity_id, action, actor_name, new_value, created_at)
      VALUES (${(wpResult.rows[0] as any).engagement_id}, 'workpaper', ${params.id}, 'sign_off_reverted',
        ${user.name || user.email}, ${JSON.stringify({ reason })}, NOW())
    `.catch(() => {})

    return NextResponse.json(result.rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
