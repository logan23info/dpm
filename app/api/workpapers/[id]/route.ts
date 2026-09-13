// app/api/workpapers/[id]/route.ts
// Wave 1 fix: workpaper_versions uses changed_by/changed_at (not saved_by/saved_at)
// Wave 2 fix: actor from getSessionUser() not x-actor-* headers
// Audit log write is NOT swallowed

import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/rbac'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await sql`SELECT * FROM workpapers WHERE id = ${params.id}`
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Wave 2: actor always from server session
    const sessionUser = await getSessionUser()
    const actorName = sessionUser?.name || sessionUser?.email || 'Unknown'
    const actorId   = sessionUser?.id   || null

    const wpResult = await sql`SELECT * FROM workpapers WHERE id = ${params.id}`
    if (wpResult.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const wp = wpResult.rows[0] as any

    if (wp.locked) return NextResponse.json({ error: 'Workpaper is locked' }, { status: 403 })

    const body = await req.json()
    const { implementation_status, test_result, residual_risk, exceptions_noted, conclusion, state } = body

    // Wave 1 fix: save version with correct column names (changed_by / changed_at)
    await sql`
      INSERT INTO workpaper_versions (workpaper_id, version, snapshot, changed_by, changed_at)
      VALUES (${params.id}, ${wp.version || 1}, ${JSON.stringify(wp)}, ${actorName}, NOW())
    `
    // ↑ NOT wrapped in .catch() — version write failure surfaces (P0-05 fix)

    const result = await sql`
      UPDATE workpapers SET
        implementation_status = COALESCE(${implementation_status || null}, implementation_status),
        test_result           = COALESCE(${test_result           || null}, test_result),
        residual_risk         = COALESCE(${residual_risk         || null}, residual_risk),
        exceptions_noted      = COALESCE(${exceptions_noted      || null}, exceptions_noted),
        conclusion            = COALESCE(${conclusion            || null}, conclusion),
        state                 = COALESCE(${state                 || null}, state),
        prepared_by           = COALESCE(prepared_by, ${actorId}),
        version               = COALESCE(version, 0) + 1,
        updated_at            = NOW()
      WHERE id = ${params.id}
      RETURNING *
    `

    // Audit log — also not swallowed (P0-10 fix)
    await sql`
      INSERT INTO audit_log (engagement_id, entity_type, entity_id, action, actor_name, new_value, created_at)
      VALUES (${wp.engagement_id}, 'workpaper', ${params.id}, 'updated', ${actorName},
              ${JSON.stringify({ test_result, implementation_status, residual_risk })}, NOW())
    `

    return NextResponse.json(result.rows[0])
  } catch (e: any) {
    console.error('PATCH workpaper error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
