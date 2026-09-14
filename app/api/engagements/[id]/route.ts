export const dynamic = "force-dynamic"

import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/rbac"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await sql`
      SELECT id, title as name, frameworks, period_start, period_end, status, created_at
      FROM engagements WHERE id = ${params.id}
    `
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { name, status, period_start, period_end } = body
    const result = await sql`
      UPDATE engagements SET
        title        = COALESCE(${name        || null}, title),
        status       = COALESCE(${status      || null}, status),
        period_start = COALESCE(${period_start || null}, period_start),
        period_end   = COALESCE(${period_end   || null}, period_end),
        updated_at   = NOW()
      WHERE id = ${params.id}
      RETURNING id, title as name, frameworks, period_start, period_end, status
    `
    return NextResponse.json(result.rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const check = await requireRole("admin")
  if (check instanceof NextResponse) return check
  const { user } = check
  try {
    const existing = await sql`SELECT title FROM engagements WHERE id = ${params.id}`
    if (existing.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    // Cascade delete children
    await sql`DELETE FROM evidence WHERE workpaper_id IN (SELECT id FROM workpapers WHERE engagement_id = ${params.id})`
    await sql`DELETE FROM comments WHERE workpaper_id IN (SELECT id FROM workpapers WHERE engagement_id = ${params.id})`
    await sql`DELETE FROM workpaper_versions WHERE workpaper_id IN (SELECT id FROM workpapers WHERE engagement_id = ${params.id})`
    await sql`DELETE FROM findings WHERE engagement_id = ${params.id}`
    await sql`DELETE FROM workpapers WHERE engagement_id = ${params.id}`
    await sql`DELETE FROM engagements WHERE id = ${params.id}`
    return NextResponse.json({ ok: true, deleted: (existing.rows[0] as any).title })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
