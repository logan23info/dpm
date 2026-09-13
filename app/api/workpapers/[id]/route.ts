// app/api/workpapers/[id]/route.ts
// Sets prepared_by on first PATCH (when auditor first edits the workpaper)
// This enables segregation of duties check in sign-off

import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/session'
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
    const actor = getActor(req)
    const sessionUser = await getSessionUser()
    const body = await req.json()

    const wpResult = await sql`SELECT * FROM workpapers WHERE id = ${params.id}`
    if (wpResult.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const wp = wpResult.rows[0] as any

    if (wp.locked) return NextResponse.json({ error: 'Workpaper is locked' }, { status: 403 })

    // Determine preparer identity
    const preparerName = sessionUser?.name || actor.name || 'Unknown'
    const preparerId   = sessionUser?.id || null

    // Set prepared_by on first edit if not already set
    const preparedBy   = wp.prepared_by   || preparerId
    const preparedName = wp.prepared_name || preparerName

    const {
      implementation_status, test_result, residual_risk,
      exceptions_noted, conclusion, state,
    } = body

    // Save version before update
    await sql`
      INSERT INTO workpaper_versions (workpaper_id, version, snapshot, saved_by, saved_at)
      VALUES (${params.id}, ${wp.version || 1}, ${JSON.stringify(wp)}, ${preparerName}, NOW())
    `.catch(() => {})

    const result = await sql`
      UPDATE workpapers SET
        implementation_status = COALESCE(${implementation_status || null}, implementation_status),
        test_result           = COALESCE(${test_result || null},           test_result),
        residual_risk         = COALESCE(${residual_risk || null},         residual_risk),
        exceptions_noted      = COALESCE(${exceptions_noted || null},      exceptions_noted),
        conclusion            = COALESCE(${conclusion || null},            conclusion),
        state                 = COALESCE(${state || null},                 state),
        prepared_by           = COALESCE(${preparedBy}, prepared_by),
        version               = COALESCE(version, 0) + 1,
        updated_at            = NOW()
      WHERE id = ${params.id}
      RETURNING *
    `

    // Audit log
    await sql`
      INSERT INTO audit_log (engagement_id, entity_type, entity_id, action, actor_name, new_value, created_at)
      VALUES (${wp.engagement_id}, 'workpaper', ${params.id}, 'updated', ${preparerName},
        ${JSON.stringify({ test_result, implementation_status, residual_risk })}, NOW())
    `.catch(() => {})

    return NextResponse.json(result.rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
