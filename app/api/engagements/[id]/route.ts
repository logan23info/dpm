// app/api/engagements/[id]/route.ts
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/rbac'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await sql`
      SELECT id, title as name, frameworks, period_start, period_end, status, created_at
      FROM engagements WHERE id = ${params.id}
    `
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // Reviewer or above can edit
  const check = await requireRole('reviewer')
  if (check instanceof NextResponse) return check

  try {
    const body = await req.json()
    const { name, status, frameworks, period_start, period_end } = body

    const result = await sql`
      UPDATE engagements SET
        title        = COALESCE(${name        || null}, title),
        status       = COALESCE(${status      || null}, status),
        frameworks   = COALESCE(${frameworks  ? JSON.stringify(frameworks) : null}::jsonb, frameworks),
        period_start = COALESCE(${period_start || null}, period_start),
        period_end   = COALESCE(${period_end   || null}, period_end),
        updated_at   = NOW()
      WHERE id = ${params.id}
      RETURNING id, title as name, frameworks, period_start, period_end, status
    `
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  // Admin only — hard delete cascades to workpapers, findings, etc.
  const check = await requireRole('admin')
  if (check instanceof NextResponse) return check
  const { user } = check

  try {
    // Confirm engagement exists
    const existing = await sql`SELECT title FROM engagements WHERE id = ${params.id}`
    if (existing.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const engName = (existing.rows[0] as any).title

    // Cascade delete (FK ON DELETE CASCADE handles child rows)
    await sql`DELETE FROM engagements WHERE id = ${params.id}`

    // Audit trail
    await sql`
      INSERT INTO audit_log (engagement_id, entity_type, entity_id, action, actor_name, new_value, created_at)
      VALUES (${params.id}, 'engagement', ${params.id}, 'deleted', ${user.name},
        ${JSON.stringify({ name: engName, deleted_by: user.name })}, NOW())
    `.catch(() => {})

    return NextResponse.json({ ok: true, deleted: engName })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
