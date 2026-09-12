// app/api/findings/[id]/route.ts
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/session'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sql`SELECT * FROM findings WHERE id = ${params.id}`
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch finding' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = getActor(req)
    const body = await req.json()
    const { action, ...fields } = body

    const existing = await sql`SELECT * FROM findings WHERE id = ${params.id}`
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const finding = existing.rows[0] as any

    // ── Management response ──────────────────────────────────────────────
    if (action === 'management_response') {
      const result = await sql`
        UPDATE findings SET
          management_response = ${fields.management_response},
          agreed_action       = ${fields.agreed_action || null},
          action_owner        = ${fields.action_owner || null},
          target_remediation_date = ${fields.target_remediation_date || null},
          status              = 'in-progress',
          updated_at          = NOW()
        WHERE id = ${params.id}
        RETURNING *
      `
      await logAudit(finding.engagement_id, params.id, 'management_response', actor.name,
        { status: finding.status },
        { status: 'in-progress', management_response: fields.management_response })
      return NextResponse.json(result.rows[0])
    }

    // ── Mark as remediated ───────────────────────────────────────────────
    if (action === 'remediate') {
      const result = await sql`
        UPDATE findings SET
          status           = 'remediated',
          remediated_date  = NOW(),
          updated_at       = NOW()
        WHERE id = ${params.id}
        RETURNING *
      `
      await logAudit(finding.engagement_id, params.id, 'remediated', actor.name,
        { status: finding.status }, { status: 'remediated' })
      return NextResponse.json(result.rows[0])
    }

    // ── Retest ──────────────────────────────────────────────────────────
    if (action === 'retest') {
      const newStatus = fields.retest_result === 'passed' ? 'closed' : 'open'
      const result = await sql`
        UPDATE findings SET
          retest_result    = ${fields.retest_result},
          retested_by      = ${actor.name},
          retested_at      = NOW(),
          status           = ${newStatus},
          closed_at        = ${newStatus === 'closed' ? new Date().toISOString() : null},
          updated_at       = NOW()
        WHERE id = ${params.id}
        RETURNING *
      `
      await logAudit(finding.engagement_id, params.id, 'retested', actor.name,
        { status: finding.status }, { status: newStatus, retest_result: fields.retest_result })
      return NextResponse.json(result.rows[0])
    }

    // ── General field update ─────────────────────────────────────────────
    const allowed = ['title', 'description', 'severity', 'status',
                     'due_date', 'remediation', 'agreed_action', 'action_owner']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (fields[key] !== undefined) updates[key] = fields[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const result = await sql`
      UPDATE findings SET
        title       = COALESCE(${updates.title as string ?? null},       title),
        description = COALESCE(${updates.description as string ?? null}, description),
        severity    = COALESCE(${updates.severity as string ?? null},    severity),
        status      = COALESCE(${updates.status as string ?? null},      status),
        due_date    = COALESCE(${updates.due_date as string ?? null},    due_date),
        updated_at  = NOW()
      WHERE id = ${params.id}
      RETURNING *
    `
    return NextResponse.json(result.rows[0])

  } catch (error) {
    console.error('PATCH finding error:', error)
    return NextResponse.json({ error: 'Failed to update finding' }, { status: 500 })
  }
}

async function logAudit(
  engagementId: string, entityId: string,
  action: string, actorName: string,
  oldVal: object, newVal: object
) {
  try {
    await sql`
      INSERT INTO audit_log (
        engagement_id, entity_type, entity_id, action,
        actor_name, old_value, new_value, created_at
      ) VALUES (
        ${engagementId}, 'finding', ${entityId}, ${action},
        ${actorName}, ${JSON.stringify(oldVal)}, ${JSON.stringify(newVal)}, NOW()
      )
    `
  } catch (e: any) { console.warn('audit_log:', e.message) }
}
