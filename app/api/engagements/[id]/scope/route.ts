// app/api/engagements/[id]/scope/route.ts
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/session'
import controls from '@/lib/controls'

// GET — scoping decisions + unscoped controls
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await sql`
      SELECT control_id, in_scope, risk_score, scoping_rationale, scoped_by, scoped_at
      FROM engagement_scope
      WHERE engagement_id = ${params.id}
    `

    const scopeMap = new Map(existing.rows.map(r => [r.control_id, r]))
    const allControls = controls.all()

    const result = allControls.map(c => ({
      control_id: c.id,
      clause_ref: c.clause_ref,
      domain: c.domain,
      framework: c.framework,
      control_objective: c.control_objective,
      inherent_risk: c.inherent_risk,
      key_control: c.key_control,
      ...( scopeMap.get(c.id) || {
        in_scope: null,       // null = not yet scoped
        risk_score: null,
        scoping_rationale: null,
        scoped_by: null,
        scoped_at: null,
      })
    }))

    const summary = {
      total: result.length,
      inScope: result.filter(r => r.in_scope === true).length,
      outOfScope: result.filter(r => r.in_scope === false).length,
      unscoped: result.filter(r => r.in_scope === null).length,
    }

    return NextResponse.json({ controls: result, summary })
  } catch (error) {
    console.error('GET scope error:', error)
    return NextResponse.json({ error: 'Failed to fetch scope' }, { status: 500 })
  }
}

// POST — set scoping decision for one or many controls
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = getActor(req)
    const body = await req.json()
    const { decisions } = body
    // decisions: [{ control_id, in_scope, risk_score, scoping_rationale }]

    if (!Array.isArray(decisions) || decisions.length === 0) {
      return NextResponse.json({ error: 'decisions array required' }, { status: 400 })
    }

    const results = []
    for (const d of decisions) {
      const result = await sql`
        INSERT INTO engagement_scope (
          engagement_id, control_id, in_scope,
          risk_score, scoping_rationale, scoped_by, scoped_at
        ) VALUES (
          ${params.id}, ${d.control_id}, ${d.in_scope},
          ${d.risk_score || null}, ${d.scoping_rationale || null},
          ${actor.name}, NOW()
        )
        ON CONFLICT (engagement_id, control_id) DO UPDATE SET
          in_scope = EXCLUDED.in_scope,
          risk_score = EXCLUDED.risk_score,
          scoping_rationale = EXCLUDED.scoping_rationale,
          scoped_by = EXCLUDED.scoped_by,
          scoped_at = NOW()
        RETURNING *
      `
      results.push(result.rows[0])
    }

    // Audit log
    await sql`
      INSERT INTO audit_log (engagement_id, entity_type, entity_id, action, actor_name, created_at)
      VALUES (${params.id}, 'scope', ${params.id}, 'updated', ${actor.name}, NOW())
    `.catch(() => {})

    return NextResponse.json({ updated: results.length, decisions: results })
  } catch (error) {
    console.error('POST scope error:', error)
    return NextResponse.json({ error: 'Failed to save scope' }, { status: 500 })
  }
}
