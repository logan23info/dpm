// app/api/privacy/breach/route.ts
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/session'

function calcDeadline(discoveredAt: string) {
  const discovered = new Date(discoveredAt)
  const deadline72h = new Date(discovered.getTime() + 72 * 60 * 60 * 1000)
  const now = new Date()
  const hoursRemaining = Math.round((deadline72h.getTime() - now.getTime()) / (1000 * 60 * 60))
  return {
    deadline72h: deadline72h.toISOString(),
    hoursRemaining,
    isOverdue: hoursRemaining < 0,
    isUrgent: hoursRemaining >= 0 && hoursRemaining <= 12,
  }
}

export async function GET(req: NextRequest) {
  try {
    const result = await sql`
      SELECT * FROM breach_register
      ORDER BY discovered_at DESC
    `

    const enriched = result.rows.map(b => ({
      ...b,
      timeline: b.sa_notification_required && b.status !== 'closed'
        ? calcDeadline(b.discovered_at)
        : null,
    }))

    const anyEnriched = enriched as any[]
    const summary = {
      total:     anyEnriched.length,
      open:      anyEnriched.filter(b => b.status === 'open').length,
      overdue:   anyEnriched.filter(b => b.timeline?.isOverdue).length,
      urgent:    anyEnriched.filter(b => b.timeline?.isUrgent).length,
      notified:  anyEnriched.filter(b => b.sa_notified_at).length,
    }

    return NextResponse.json({ breaches: enriched, summary })
  } catch (error) {
    console.error('GET breach error:', error)
    return NextResponse.json({ error: 'Failed to fetch breaches' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = getActor(req)
    const body = await req.json()
    const {
      title, discovered_at, description, breach_type,
      data_categories_affected, estimated_individuals,
      severity, likely_harm, sa_notification_required,
    } = body

    if (!title || !discovered_at) {
      return NextResponse.json(
        { error: 'title and discovered_at are required' },
        { status: 400 }
      )
    }

    // Auto-generate ref
    const count = await sql`SELECT COUNT(*) FROM breach_register`
    const ref = `BR-${new Date().getFullYear()}-${String(parseInt(count.rows[0].count) + 1).padStart(3, '0')}`

    const result = await sql`
      INSERT INTO breach_register (
        ref, title, discovered_at, description,
        breach_type, data_categories_affected, estimated_individuals,
        severity, likely_harm, sa_notification_required,
        status, created_by
      ) VALUES (
        ${ref}, ${title}, ${discovered_at}, ${description || null},
        ${JSON.stringify(breach_type || [])},
        ${JSON.stringify(data_categories_affected || [])},
        ${estimated_individuals || null},
        ${severity || 'medium'}, ${likely_harm || null},
        ${sa_notification_required || false},
        'open', ${actor.name}
      )
      RETURNING *
    `
    const breach = result.rows[0]
    return NextResponse.json({
      ...breach,
      timeline: breach.sa_notification_required
        ? calcDeadline(breach.discovered_at)
        : null,
    }, { status: 201 })
  } catch (error) {
    console.error('POST breach error:', error)
    return NextResponse.json({ error: 'Failed to log breach' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = getActor(req)
    const body = await req.json()
    const { id, action, ...fields } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    if (action === 'notify_sa') {
      const result = await sql`
        UPDATE breach_register SET
          sa_notified_at = NOW(), status = 'notified',
          sa_reference = ${fields.sa_reference || null},
          updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `
      return NextResponse.json(result.rows[0])
    }

    if (action === 'close') {
      const result = await sql`
        UPDATE breach_register SET
          status = 'closed', root_cause = ${fields.root_cause || null},
          remediation = ${fields.remediation || null}, updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `
      return NextResponse.json(result.rows[0])
    }

    // General update
    const result = await sql`
      UPDATE breach_register SET
        title            = COALESCE(${fields.title || null},            title),
        description      = COALESCE(${fields.description || null},      description),
        severity         = COALESCE(${fields.severity || null},         severity),
        status           = COALESCE(${fields.status || null},           status),
        containment_measures = COALESCE(${fields.containment_measures || null}, containment_measures),
        updated_at       = NOW()
      WHERE id = ${id} RETURNING *
    `
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update breach' }, { status: 500 })
  }
}
