// app/api/engagements/[id]/bulk-workpapers/route.ts
// Create workpapers for multiple controls in one request
// POST { framework?, keyOnly?, controlIds? }

import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/session'
import controls from '@/lib/controls'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = getActor(req)
    const body = await req.json()
    const { framework, keyOnly, controlIds } = body

    // Determine which controls to create
    let targets = controlIds
      ? controlIds.map((id: string) => controls.get(id)).filter(Boolean)
      : framework
      ? keyOnly
        ? controls.keyControls(framework)
        : controls.byFramework(framework)
      : keyOnly
      ? controls.keyControls()
      : controls.all()

    if (targets.length === 0) {
      return NextResponse.json({ error: 'No controls match criteria' }, { status: 400 })
    }

    // Check which controls already have workpapers in this engagement
    const existing = await sql`
      SELECT control_id FROM workpapers
      WHERE engagement_id = ${params.id}
    `
    const existingIds = new Set(existing.rows.map(r => r.control_id))
    const toCreate = targets.filter((c: any) => !existingIds.has(c.id))

    if (toCreate.length === 0) {
      return NextResponse.json({
        created: 0,
        skipped: targets.length,
        message: 'All selected controls already have workpapers',
      })
    }

    // Bulk insert
    const created: string[] = []
    const errors: string[] = []

    for (const control of toCreate) {
      try {
        const result = await sql`
          INSERT INTO workpapers (
            engagement_id, control_id, version, state, updated_at
          ) VALUES (
            ${params.id},
            ${control.id},
            1,
            'draft',
            NOW()
          )
          RETURNING id
        `
        created.push(result.rows[0].id)

        // Audit log
        await sql`
          INSERT INTO audit_log (
            engagement_id, entity_type, entity_id, action, actor_name, created_at
          ) VALUES (
            ${params.id}, 'workpaper', ${result.rows[0].id}, 'created', ${actor.name}, NOW()
          )
        `.catch(() => {}) // non-fatal

      } catch (err: any) {
        errors.push(`${control.id}: ${err.message}`)
      }
    }

    return NextResponse.json({
      created:   created.length,
      skipped:   targets.length - toCreate.length,
      errors:    errors.length,
      total:     targets.length,
      workpaperIds: created,
      errorDetails: errors,
    }, { status: 201 })

  } catch (error) {
    console.error('Bulk workpaper error:', error)
    return NextResponse.json({ error: 'Failed to create workpapers' }, { status: 500 })
  }
}
