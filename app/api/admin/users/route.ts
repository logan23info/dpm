// app/api/admin/users/route.ts
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  const check = await requireRole('admin')
  if (check instanceof NextResponse) return check

  try {
    const result = await sql`
      SELECT id, name, email, role, department, "createdAt", "emailVerified"
      FROM "user" ORDER BY "createdAt" DESC
    `
    return NextResponse.json(result.rows as any[])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const check = await requireRole('admin')
  if (check instanceof NextResponse) return check

  try {
    const { id, role, department } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const valid = ['admin', 'reviewer', 'preparer', 'viewer']
    if (role && !valid.includes(role))
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

    const result = await sql`
      UPDATE "user" SET
        role        = COALESCE(${role || null}, role),
        department  = COALESCE(${department || null}, department),
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING id, name, email, role, department
    `
    return NextResponse.json(result.rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
