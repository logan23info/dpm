// app/api/workpapers/[id]/signoff/route.ts
// Sign-off and revert — with audit log + open-notes gate

import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/session'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = getActor(req)
    const body = await req.json()
    const { action } = body

    const wpResult = await sql`SELECT * FROM workpapers WHERE id = ${params.id}`
    if (wpResult.rows.length === 0) {
      return NextResponse.json({ error: 'Workpaper not found' }, { status: 404 })
    }

    const wp = wpResult.rows[0]

    if (action === 'signoff') {
      // ── Gate: check for open review notes ──────────────────────────
      const openNotes = await sql`
        SELECT COUNT(*) AS count FROM comments
        WHERE workpaper_id = ${params.id}
          AND status = 'open'
          AND note_type = 'review_note'
      `
      const openCount = parseInt(openNotes.rows[0].count)
      if (openCount > 0) {
        return NextResponse.json(
          {
            error: `Cannot sign off — ${openCount} open review note(s) must be cleared first.`,
            openNotes: openCount,
          },
          { status: 422 }
        )
      }

      const result = await sql`
        UPDATE workpapers SET
          reviewed_by   = ${actor.name},
          signed_off_at = NOW(),
          locked        = TRUE,
          updated_at    = NOW()
        WHERE id = ${params.id}
        RETURNING *
      `
      const signed = result.rows[0]

      // Audit log
      try {
        await sql`
          INSERT INTO audit_log (
            engagement_id, entity_type, entity_id, action,
            actor_name, new_value, created_at
          ) VALUES (
            ${signed.engagement_id}, 'workpaper', ${params.id}, 'signed_off',
            ${actor.name}, ${JSON.stringify({ reviewed_by: actor.name, signed_off_at: signed.signed_off_at })},
            NOW()
          )
        `
      } catch (e: any) { console.warn('audit_log:', e.message) }

      return NextResponse.json({
        success: true,
        message: `Workpaper signed off by ${actor.name}`,
        workpaper: signed,
      })
    }

    if (action === 'revert') {
      const { reason } = body
      if (!reason?.trim()) {
        return NextResponse.json(
          { error: 'A reason is required to revert sign-off.' },
          { status: 400 }
        )
      }

      const result = await sql`
        UPDATE workpapers SET
          reviewed_by   = NULL,
          signed_off_at = NULL,
          locked        = FALSE,
          updated_at    = NOW()
        WHERE id = ${params.id}
        RETURNING *
      `
      const reverted = result.rows[0]

      // Audit log — revert with reason
      try {
        await sql`
          INSERT INTO audit_log (
            engagement_id, entity_type, entity_id, action,
            actor_name, new_value, created_at
          ) VALUES (
            ${reverted.engagement_id}, 'workpaper', ${params.id}, 'signoff_reverted',
            ${actor.name}, ${JSON.stringify({ reason, reverted_by: actor.name })},
            NOW()
          )
        `
      } catch (e: any) { console.warn('audit_log:', e.message) }

      return NextResponse.json({
        success: true,
        message: 'Sign-off reverted',
        workpaper: reverted,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Sign-off error:', error)
    return NextResponse.json({ error: 'Failed to process sign-off' }, { status: 500 })
  }
}
