// app/api/workpapers/[id]/route.ts
// GET, PATCH workpaper
// PATCH: writes workpaper_versions snapshot + audit_log entry
// PATCH: blocked when workpaper is locked (signed off)

import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/session'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wp = await sql`
      SELECT * FROM workpapers WHERE id = ${params.id}
    `
    if (wp.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const versions = await sql`
      SELECT id, version, changed_by, changed_at
      FROM workpaper_versions
      WHERE workpaper_id = ${params.id}
      ORDER BY version DESC
    `

    return NextResponse.json({ ...wp.rows[0], versions: versions.rows })
  } catch (error) {
    console.error('GET /api/workpapers/:id:', error)
    return NextResponse.json({ error: 'Failed to fetch workpaper' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = getActor(req)
    const body = await req.json()

    // Fetch current workpaper
    const wpResult = await sql`
      SELECT * FROM workpapers WHERE id = ${params.id}
    `
    if (wpResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const wp = wpResult.rows[0]

    // 🔒 Block edits on signed-off workpapers
    if (wp.signed_off_at) {
      return NextResponse.json(
        {
          error: 'This workpaper is signed off and locked. Revert sign-off before editing.',
          locked: true,
        },
        { status: 403 }
      )
    }

    const oldSnapshot = { ...wp }

    const allowed = [
      'implementation_status',
      'test_result',
      'residual_risk',
      'exceptions_noted',
      'conclusion',
    ]

    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const nextVersion = (wp.version || 1) + 1

    const result = await sql`
      UPDATE workpapers SET
        implementation_status = COALESCE(${updates.implementation_status as string ?? null}, implementation_status),
        test_result           = COALESCE(${updates.test_result as string ?? null},           test_result),
        residual_risk         = COALESCE(${updates.residual_risk as string ?? null},          residual_risk),
        exceptions_noted      = COALESCE(${updates.exceptions_noted as string ?? null},       exceptions_noted),
        conclusion            = COALESCE(${updates.conclusion as string ?? null},             conclusion),
        version               = ${nextVersion},
        updated_at            = NOW()
      WHERE id = ${params.id}
      RETURNING *
    `
    const newWp = result.rows[0]

    // ── Write version snapshot ─────────────────────────────────────────
    try {
      await sql`
        INSERT INTO workpaper_versions (workpaper_id, version, snapshot, changed_by, changed_at)
        VALUES (
          ${params.id},
          ${nextVersion},
          ${JSON.stringify(newWp)},
          ${actor.name},
          NOW()
        )
      `
    } catch (vErr: any) {
      console.warn('workpaper_versions insert failed:', vErr.message)
    }

    // ── Write audit log ────────────────────────────────────────────────
    try {
      await sql`
        INSERT INTO audit_log (
          engagement_id, entity_type, entity_id, action,
          actor_name, old_value, new_value, created_at
        ) VALUES (
          ${newWp.engagement_id},
          'workpaper',
          ${params.id},
          'updated',
          ${actor.name},
          ${JSON.stringify(oldSnapshot)},
          ${JSON.stringify(newWp)},
          NOW()
        )
      `
    } catch (aErr: any) {
      console.warn('audit_log insert failed:', aErr.message)
    }

    return NextResponse.json(newWp)
  } catch (error) {
    console.error('PATCH /api/workpapers/:id:', error)
    return NextResponse.json({ error: 'Failed to update workpaper' }, { status: 500 })
  }
}
