// app/api/engagements/[id]/assign/route.ts
// Assign users to engagements as preparer or reviewer
// Only admin can assign

import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await sql`
      SELECT ea.id, ea.user_id, ea.role_in_engagement, ea.assigned_at,
             u.name, u.email, u.role
      FROM engagement_assignments ea
      JOIN "user" u ON ea.user_id = u.id
      WHERE ea.engagement_id = ${params.id}
      ORDER BY ea.assigned_at DESC
    `
    return NextResponse.json(result.rows as any[])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const check = await requireRole('admin')
  if (check instanceof NextResponse) return check
  const { user: admin } = check

  try {
    const { user_id, role_in_engagement } = await req.json()
    if (!user_id || !role_in_engagement) return NextResponse.json({ error: 'user_id and role_in_engagement required' }, { status: 400 })

    const valid = ['preparer', 'reviewer', 'lead']
    if (!valid.includes(role_in_engagement)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

    const result = await sql`
      INSERT INTO engagement_assignments (engagement_id, user_id, role_in_engagement, assigned_by, assigned_at)
      VALUES (${params.id}, ${user_id}, ${role_in_engagement}, ${admin.id}, NOW())
      ON CONFLICT (engagement_id, user_id) DO UPDATE SET role_in_engagement = ${role_in_engagement}, assigned_at = NOW()
      RETURNING *
    `
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const check = await requireRole('admin')
  if (check instanceof NextResponse) return check

  try {
    const { user_id } = await req.json()
    await sql`DELETE FROM engagement_assignments WHERE engagement_id = ${params.id} AND user_id = ${user_id}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}